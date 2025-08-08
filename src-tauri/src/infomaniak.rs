use serde_json::{self, Value};
use reqwest::{self, header::CONTENT_TYPE, Method};

use crate::storage::CONFIG;

async fn fetch(method: Method, url: &str, data: &str) -> Result<String, String> {
	let config = CONFIG.lock().unwrap().clone();

	let client = reqwest::Client::new();
	let request = client.request(method, format!("https://api.infomaniak.com/1/newsletters/{}/{}", config.infomaniak_domain, url))
		.header(CONTENT_TYPE, "application/json")
		.bearer_auth(config.infomaniak_secret)
		.body(data.to_string())
		.send().await.map_err(|e| reqwest_error(e))?
		.text().await.map_err(|e| reqwest_error(e))?;

	return Ok(request);
}

fn reqwest_error(e: reqwest::Error) -> String {
	return format!("{{\"result\":\"error\",\"error\":{{\"code\":\"request_failed\",\"description\":\"{}\"}}}}", e);
}

fn serde_error(e: serde_json::Error) -> String {
	return format!("{{\"result\":\"error\",\"error\":{{\"code\":\"failed_json_parsing\",\"description\":\"{}\"}}}}", e);
}


// Tauri functions
#[tauri::command]
pub async fn get_campaigns() -> Result<String, String> {
	Ok(fetch(Method::GET, "campaigns", "").await?)
}

#[tauri::command]
pub async fn get_campaign(id: u32) -> Result<String, String> {
	Ok(fetch(Method::GET, &format!("campaigns/{}?with=recipients,content", id), "").await?)
}

#[tauri::command]
pub async fn create_campaign(data: &str) -> Result<String, String> {
	Ok(fetch(Method::POST, "campaigns", data).await?)
}

#[tauri::command]
pub async fn update_campaign(id: u32, data: &str) -> Result<String, String> {
	Ok(fetch(Method::PUT, &format!("campaigns/{}", id), data).await?)
}

#[tauri::command]
pub async fn delete_campaign(id: u32) -> Result<String, String> {
	Ok(fetch(Method::DELETE, &format!("campaigns/{}", id), "").await?)
}

#[tauri::command]
pub async fn test_campaign(id: u32, data: &str) -> Result<String, String> {
	Ok(fetch(Method::POST, &format!("campaigns/{}/test", id), data).await?)
}

#[tauri::command]
pub async fn send_campaign(id: u32) -> Result<String, String> {
	Ok(fetch(Method::PUT, &format!("campaigns/{}/schedule", id), "").await?)
}

#[tauri::command]
pub async fn get_mailinglists() -> Result<String, String> {
	Ok(fetch(Method::GET, "groups", "").await?)
}

#[tauri::command]
pub async fn create_mailinglist(data: &str) -> Result<String, String> {
	Ok(fetch(Method::POST, "groups", data).await?)
}

#[tauri::command]
pub async fn update_mailinglist(id: u32, data: &str) -> Result<String, String> {
	Ok(fetch(Method::PUT, &format!("groups/{}", id), data).await?)
}

#[tauri::command]
pub async fn delete_mailinglist(id: u32) -> Result<String, String> {
	Ok(fetch(Method::DELETE, &format!("groups/{}", id), "").await?)
}

#[tauri::command]
pub async fn mailinglist_get_contacts(id: u32) -> Result<String, String> {
	Ok(fetch(Method::GET, "subscribers", &format!("{{\"filter\":{{\"groups\":[{id}]}}}}")).await?)
}

#[tauri::command]
pub async fn mailinglist_assign_contacts(id: u32, data: &str) -> Result<String, String> {
	Ok(fetch(Method::POST, &format!("groups/{}/subscribers/assign", id), data).await?)
}

// special implementations
#[tauri::command]
pub async fn mailinglist_add_contact(group: u32, email: &str) -> Result<String, String> {
	let config = CONFIG.lock().unwrap().clone();

	// get all scbscribers
	let client = reqwest::Client::new();
	let subscribers = client.request(Method::GET, format!("https://api.infomaniak.com/1/newsletters/{}/subscribers", config.infomaniak_domain))
		.header(CONTENT_TYPE, "application/json")
		.bearer_auth(&config.infomaniak_secret)
		.send().await.map_err(|e| reqwest_error(e))?
		.text().await.map_err(|e| reqwest_error(e))?;

	// search for existing subscriber with email
	let list: Value = serde_json::from_str(&subscribers).map_err(|e| serde_error(e))?;
	let mut id = String::new();
	let empty_vec: Vec<Value> = Vec::new();

	let data = match list["data"].as_array() {
		Some(data) => data,
		None => &empty_vec,
	};

	for subscriber in data {
		if subscriber["email"].as_str() == Some(email) {
			id = match subscriber["id"].as_number() {
				Some(number) => number.to_string(),
				None => return Err("{\"result\":\"error\",\"error\":{\"code\":\"no_id\",\"description\":\"Subscriber didnt have an id\"}}".to_string()),
			};
		}
	}

	let output;

	if id == String::new() {
		// create new subscriber and add it to group
		output = client.request(Method::POST, format!("https://api.infomaniak.com/1/newsletters/{}/subscribers", config.infomaniak_domain))
			.header(CONTENT_TYPE, "application/json")
			.bearer_auth(&config.infomaniak_secret)
			.body(format!("{{\"email\":\"{}\",\"groups\":[{}]}}", email, group))
			.send().await.map_err(|e| reqwest_error(e))?
			.text().await.map_err(|e| reqwest_error(e))?;
	}
	else {
		// add existing user to group
		output = client.request(Method::POST, format!("https://api.infomaniak.com/1/newsletters/{}/groups/{}/subscribers/assign", config.infomaniak_domain, group))
			.header(CONTENT_TYPE, "application/json")
			.bearer_auth(&config.infomaniak_secret)
			.body(format!("{{\"subscriber_ids\":[{}]}}", id))
			.send().await.map_err(|e| reqwest_error(e))?
			.text().await.map_err(|e| reqwest_error(e))?;
	}

	return Ok(output);
}

#[tauri::command]
pub async fn mailinglist_remove_contact(subscriber: u32, group: i64) -> Result<String, String> {
	let config = CONFIG.lock().unwrap().clone();

	// get all scbscribers
	let client = reqwest::Client::new();
	let subscribers = client.request(Method::GET, format!("https://api.infomaniak.com/1/newsletters/{}/subscribers/{}?with=groups", config.infomaniak_domain, subscriber))
		.header(CONTENT_TYPE, "application/json")
		.bearer_auth(&config.infomaniak_secret)
		.send().await.map_err(|e| reqwest_error(e))?
		.text().await.map_err(|e| reqwest_error(e))?;

	// search for existing subscriber with email
	let list: Value = serde_json::from_str(&subscribers).map_err(|e| serde_error(e))?;
	let len = match list["data"]["groups"].as_array() {
		Some(groups) => groups.len(),
		None => 0,
	};

	let first_group = match list["data"]["groups"][0]["id"].as_i64() {
		Some(group_id) => group_id,
		None => return Err("{\"result\":\"error\",\"error\":{\"code\":\"no_id\",\"description\":\"Subscriber did not have an id\"}}".to_string()),
	};

	if (len == 1 && first_group == group) || len == 0 {
		// delete subscriber
		let response = client.request(Method::DELETE, format!("https://api.infomaniak.com/1/newsletters/{}/subscribers/{}/forget", config.infomaniak_domain, subscriber))
			.header(CONTENT_TYPE, "application/json")
			.bearer_auth(&config.infomaniak_secret)
			.send().await.map_err(|e| reqwest_error(e))?
			.text().await.map_err(|e| reqwest_error(e))?;

		println!("Forgot subscriber");
		return Ok(response);
	}
	else if len > 1 {
		// remove subscriber from group
		let response = client.request(Method::POST, format!("https://api.infomaniak.com/1/newsletters/{}/groups/{}/subscribers/unassign", config.infomaniak_domain, group))
			.header(CONTENT_TYPE, "application/json")
			.bearer_auth(&config.infomaniak_secret)
			.body(format!("{{\"subscriber_ids\":[{subscriber}]}}"))
			.send().await.map_err(|e| reqwest_error(e))?
			.text().await.map_err(|e| reqwest_error(e))?;

		println!("Removed subscriber from group");
		return Ok(response);
	} 
	else {
		return Err("{\"result\":\"error\",\"error\":{\"code\":\"subscriber_doesnt_exist\",\"description\":\"Selected subscriber is not part of the selected group\"}}".to_string());
	}
}

#[tauri::command]
pub async fn get_credits() -> Result<String, String> {
	let config = CONFIG.lock().unwrap().clone();

	let client = reqwest::Client::new();
	let response = client.request(Method::GET, format!("https://api.infomaniak.com/1/newsletters/{}/credits/details", config.infomaniak_domain))
		.header(CONTENT_TYPE, "application/json")
		.bearer_auth(&config.infomaniak_secret)
		.send().await.map_err(|e| reqwest_error(e))?
		.text().await.map_err(|e| reqwest_error(e))?;

	let json: Value = serde_json::from_str(&response).map_err(|e| serde_error(e))?;

	return match json["data"]["total"].as_number() {
		Some(credit) => Ok(credit.to_string()),
		None => Err("{\"result\":\"error\",\"error\":{\"code\":\"unknow_credit\",\"description\":\"Credit could not be retrieved\"}}".to_string()),
	};
}
