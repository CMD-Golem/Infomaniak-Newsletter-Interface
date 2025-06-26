use serde_json::{self, Value};
use std::{os::windows::process::CommandExt, process::Command};

use crate::storage::CONFIG;

fn curl(header: &str, url: &str, data: &str) -> String {
	let config = CONFIG.lock().unwrap();

	let output = Command::new("curl")
		.arg("-X").arg(header)
		.arg(format!("https://api.infomaniak.com/1/newsletters/{}/{}", config.infomaniak_domain, url))
		.arg("-d").arg(data.to_string())
		.arg("-H").arg(format!( "Authorization: Bearer {}", config.infomaniak_secret))
		.arg("-H").arg("Content-Type: application/json")
		.creation_flags(0x08000000)
		.output();

	match output {
		Ok(success) => String::from_utf8_lossy(&success.stdout).into(),
		Err(err) => err.to_string(),
	}
}

// Tauri functions
#[tauri::command]
pub fn get_campaigns() -> String {
	curl("GET", "campaigns", "").into()
}

#[tauri::command]
pub fn get_campaign(id: u32) -> String {
	curl("GET", &format!("campaigns/{}?with=recipients,content", id), "").into()
}

#[tauri::command]
pub fn create_campaign(data: &str) -> String {
	curl("POST", "campaigns", data).into()
}

#[tauri::command]
pub fn update_campaign(id: u32, data: &str) -> String {
	curl("PUT", &format!("campaigns/{}", id), data).into()
}

#[tauri::command]
pub fn delete_campaign(id: u32) -> String {
	curl("DELETE", &format!("campaigns/{}", id), "").into()
}

#[tauri::command]
pub fn test_campaign(id: u32, data: &str) -> String {
	curl("POST", &format!("campaigns/{}/test", id), data).into()
}

#[tauri::command]
pub fn send_campaign(id: u32) -> String {
	curl("PUT", &format!("campaigns/{}/schedule", id), "").into()
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
pub fn update_mailinglist(id: u32, data: &str) -> String {
	curl("PUT", &format!("groups/{}", id), data).into()
}

#[tauri::command]
pub fn delete_mailinglist(id: u32) -> String {
	curl("DELETE", &format!("groups/{}", id), "").into()
}

#[tauri::command]
pub fn mailinglist_get_contacts(id: u32) -> String {
	curl("GET", "subscribers", &format!("{{\"filter\":{{\"groups\":[{id}]}}}}")).into()
}

#[tauri::command]
pub fn mailinglist_assign_contacts(id: u32, data: &str) -> String {
	curl("POST", &format!("groups/{}/subscribers/assign", id), data).into()
}

// special implementations
#[tauri::command]
pub fn mailinglist_add_contact(group: u32, email: &str) -> String {
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
	} else {
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
		Err(err) => err.to_string(),
	}
}

#[tauri::command]
pub fn mailinglist_remove_contact(subscriber: u32, group: i64) -> String {
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

	if (len == 1 && list["data"]["groups"][0]["id"].as_number().unwrap().as_i64().unwrap() == group) || len == 0 {
		// delete subscriber
		let output = Command::new("curl")
			.arg("-X").arg("DELETE")
			.arg(format!("https://api.infomaniak.com/1/newsletters/{}/subscribers/{}/forget", config.infomaniak_domain, subscriber))
			.arg("-H").arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
			.arg("-H").arg("Content-Type: application/json")
			.creation_flags(0x08000000)
			.output()
			.expect("Error");

		println!("Forget subscriber");
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

		println!("Remove subscriber from group");
		return String::from_utf8_lossy(&output.stdout).to_string();
	} 
	else {
		return "{\"result\":\"error\",\"error\":{\"code\":\"subscriber_doesnt_exist\",\"description\":\"Selected subscriber isn't part of the selected group\"}}".to_string();
	}
}

#[tauri::command]
pub fn get_credits() -> String {
	let result: Result<String, &str> = (|| {
        let json: Value = serde_json::from_str(&curl("GET", "credits/details", "")).map_err(|_| "Invalid JSON")?;
        let credit = json["data"]["total"].as_number().ok_or("Missing or invalid credit")?;
        Ok(credit.to_string())
    })();

	match result {
		Ok(credit) => credit.to_string(),
		Err(err) => err.to_string(),
	}
}
