// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;

const SECRET: &str = "Really Secret";

#[tauri::command]
fn get_campaigns() -> String {
	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg("https://newsletter.infomaniak.com/api/v1/public/campaign")
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn get_campaign(id: i32) -> String {
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn create_campaign(data: &str) -> String {
	// let data = "{\"subject\":\"test\",\"email_from_name\":\"PR-Modellbau\",\"lang\":\"de\",\"email_from_addr\":\"info@example.com\",\"content\":\"<span>My content</span>\",\"mailinglistIds\": [226639]}";

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg("https://newsletter.infomaniak.com/api/v1/public/campaign")
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn update_campaign(id: i32, data: &str) -> String {
	// let data = "{\"content\":\"<span>My content updated</span>\"}"

	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("PUT")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn delete_campaign(id: i32) -> String {
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("DELETE")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn test_campaign(id: i32, data: &str) -> String {
	// let data = "{\"email\":\"myemail@mydomain.com\"}"

	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}/test", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn send_campaign(id: i32) -> String {
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}/send", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn get_mailinglists() -> String {
	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg("https://newsletter.infomaniak.com/api/v1/public/mailinglist")
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn create_mailinglist(data: &str) -> String {
	// let data = "{\"name\":\"My first mailinglist\"}"

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg("https://newsletter.infomaniak.com/api/v1/public/mailinglist")
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn update_mailinglist(id: i32, data: &str) -> String {
	// let data = "{\"name\":\"My first mailinglist\"}"

	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("PUT")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn delete_mailinglist(id: i32) -> String {
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("DELETE")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn mailinglist_get_contacts(id: i32) -> String {
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/contact", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn mailinglist_add_contact(id: i32, data: &str) -> String {
    // let data = "{\"contacts\": [ {\"email\":\"test1@mydomain.com\"}, {\"email\":\"test2@mydomain.com\"} ]}"

	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/importcontact", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn mailinglist_remove_contact(id: i32, data: &str) -> String {
    // let data = "{\"email\":\"test1@mydomain.com\", \"status\":\"delete\"}"

	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/managecontact", id);

	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn get_credits() -> String {
	let output = Command::new("curl")
        .arg("-u").arg(SECRET)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg("https://newsletter.infomaniak.com/api/v1/public/credit")
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}



fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_campaigns, get_campaign, create_campaign, update_campaign, delete_campaign, test_campaign, send_campaign, get_mailinglists, create_mailinglist, update_mailinglist, delete_mailinglist, mailinglist_get_contacts, mailinglist_add_contact, mailinglist_remove_contact, get_credits])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
