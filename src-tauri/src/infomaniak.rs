use std::{
	process::Command,
	os::windows::process::CommandExt
};
use serde_json::{self, Value};

use crate::storage::CONFIG;

fn curl(header: &str, url: &str, data: &str) -> String {
	let config = CONFIG.lock().unwrap();
	let output = Command::new("curl")
		.arg("-X").arg(header)
		.arg(format!("https://api.infomaniak.com/1/newsletters/{}/{}", config.infomaniak_domain, url))
		.arg("-d").arg(data)
		.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
		.arg("-H").arg("Content-Type: application/json")
		
		.creation_flags(0x08000000)
		.output();

	match output {
		Ok(success) => String::from_utf8_lossy(&success.stdout).into(),
		Err(err) => err.to_string()
	}
}



// Tauri functions
#[tauri::command]
pub fn get_campaigns() -> String {
	curl("GET", "campaigns", "").into()
}

#[tauri::command]
pub fn get_campaign(id: i32) -> String {
	curl("GET", &format!("campaigns/{}", id), "").into()
}

#[tauri::command]
pub fn create_campaign(data: &str) -> String {
	curl("POST", "campaigns", data).into()
}

#[tauri::command]
pub fn update_campaign(id: i32, data: &str) -> String {
	curl("PUT", &format!("campaigns/{}", id), data).into()
}

#[tauri::command]
pub fn delete_campaign(id: i32) -> String {
	curl("DELETE", &format!("campaigns/{}", id), "").into()
}

#[tauri::command]
pub fn test_campaign(id: i32, data: &str) -> String {
	curl("POST", &format!("campaigns/{}/test", id), data).into()
}

#[tauri::command]
pub fn send_campaign(id: i32, data: &str) -> String {
	curl("PUT", &format!("campaigns/{}/schedule", id), data).into()
}

#[tauri::command]
pub fn get_mailinglists() -> String {
	curl("GET", "groups", "").into()
}

#[tauri::command]
pub fn create_mailinglist(data: &str) -> String {
	curl("POST", "groups", data).into()
}

#[tauri::command]
pub fn update_mailinglist(id: i32, data: &str) -> String {
	curl("PUT", &format!("groups/{}", id), data).into()
}

#[tauri::command]
pub fn delete_mailinglist(id: i32) -> String {
	curl("DELETE", &format!("groups/{}", id), "").into()
}

#[tauri::command]
pub fn mailinglist_get_contacts(id: i32) -> String {
	curl("GET", &format!("groups/{}/subscribers", id), "").into()
}


// special implementations
#[tauri::command]
pub fn mailinglist_add_contact(email: &str, group: &str) -> String {
	let config = CONFIG.lock().unwrap();

	// get all scbscribers
	let fetch = Command::new("curl")
		.arg("-X").arg("GET")
		.arg(format!("https://api.infomaniak.com/1/newsletters/{}/subscribers", config.infomaniak_domain))
		.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
		.arg("-H").arg("Content-Type: application/json")
		
		.creation_flags(0x08000000)
		.output()
		.expect("Coudnt connect with the Infomaniak API");

	// search for existing subscriber with email
	let list: Value = serde_json::from_str(&String::from_utf8_lossy(&fetch.stdout)).expect("Invalid JSON response");
	let mut id = String::new();
	
	for subscriber in list["data"].as_array().unwrap() {
		if subscriber["email"].as_str().unwrap() == email {
			id = subscriber["id"].as_number().unwrap().to_string();
		}
	}

	let output;

	if id == String::new() {
		// create new subscriber and add it to group
		output = Command::new("curl")
			.arg("-X").arg("POST")
			.arg(format!("https://api.infomaniak.com/1/newsletters/{}/subscribers", config.infomaniak_domain))
			.arg("-d").arg(format!("{{\"email\":\"{}\",\"groups\":[{}]}}", email, group))
			.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
			.arg("-H").arg("Content-Type: application/json")
			
			.creation_flags(0x08000000)
			.output();
	}
	else {
		// add existing user to group
		output = Command::new("curl")
			.arg("-X").arg("POST")
			.arg(format!("https://api.infomaniak.com/1/newsletters/{}/groups/{}/subscribers/assign", config.infomaniak_domain, group))
			.arg("-d").arg(format!("{{\"subscriber_ids\":[{}]}}", id))
			.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
			.arg("-H").arg("Content-Type: application/json")
			
			.creation_flags(0x08000000)
			.output();
	}

	match output {
		Ok(success) => String::from_utf8_lossy(&success.stdout).into(),
		Err(err) => err.to_string()
	}
}

#[tauri::command]
pub fn mailinglist_remove_contact(subscriber: &str, group: &str) -> String {
	let config = CONFIG.lock().unwrap();

	// get all scbscribers
	let fetch = Command::new("curl")
		.arg("-X").arg("GET")
		.arg(format!("https://api.infomaniak.com/1/newsletters/{}/subscribers/{}?with=groups", config.infomaniak_domain, subscriber))
		.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
		.arg("-H").arg("Content-Type: application/json")
		
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	// search for existing subscriber with email
	let list: Value = serde_json::from_str(&String::from_utf8_lossy(&fetch.stdout)).expect("Invalid JSON response");
	let len = list["data"]["groups"].as_array().unwrap().len();

	if (len == 1 && list["data"]["groups"][0]["id"].as_number().unwrap().to_string() == group) || len == 0 {
		// delete subscriber
		let output = Command::new("curl")
			.arg("-X").arg("DELETE")
			.arg(format!("https://api.infomaniak.com/1/newsletters/{}/subscribers{}/forget", config.infomaniak_domain, subscriber))
			.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
			.arg("-H").arg("Content-Type: application/json")
			
			.creation_flags(0x08000000)
			.output()
			.expect("Error");

		return String::from_utf8_lossy(&output.stdout).to_string();
	}
	else if len > 1 {
		// remove subscriber from group
		let output = Command::new("curl")
			.arg("-X").arg("POST")
			.arg(format!("https://api.infomaniak.com/1/newsletters/{}/groups/{}/subscribers/unassign", config.infomaniak_domain, group))
			.arg("-d").arg(format!("{{\"subscriber_ids\":[{subscriber}]}}"))
			.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
			.arg("-H").arg("Content-Type: application/json")
			
			.creation_flags(0x08000000)
			.output()
			.expect("Error");

		return String::from_utf8_lossy(&output.stdout).to_string();
	}
	else {
		return "{\"result\":\"error\",\"error\":{\"code\":\"subscriber_doesnt_exist\",\"description\":\"Selected subscriber isn't part of the selected group\"}}".to_string();
	}
}

#[tauri::command]
pub fn get_credits() -> String {
	let list: Value = serde_json::from_str(&curl("GET", "credits/details", "")).expect("Invailid JSON response");
	let total = list["data"]["total"].as_number().unwrap();

	return total.to_string();
}