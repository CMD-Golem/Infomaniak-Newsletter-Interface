// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::io::{self, Write};
use serde::{Deserialize, Serialize};


#[tauri::command]
fn open_link(url: &str) {
	Command::new("cmd")
        .args(&["/C", "start", url])
        .output()
        .expect("Failed to open URL");
}

// #########################################################################
// config storage functions
#[derive(Serialize, Deserialize, Debug)]
struct Config {
	infomaniak_secret: String,
	ftp_user: String,
	ftp_password: String,
	github_secret: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct ReturnConfig {
	infomaniak_secret: bool,
	ftp_user: bool,
	ftp_password: bool,
	github_secret: bool,
}

#[derive(Debug, Deserialize)]
struct ChangeConfigObj {
    property: String,
    value: String,
}

impl Config {
	fn load() -> io::Result<Self> {
        let encrypted_content = fs::read_to_string(Config::path())?;
		let decrypted_content = Config::encrypt(&encrypted_content);
        let config: Config = serde_json::from_str(&decrypted_content)?;
        Ok(config)
    }

	fn save(&self) -> io::Result<()> {
		let config_content = serde_json::to_string_pretty(self)?;
		let encrypted_content = Config::encrypt(&config_content);
		let mut file = fs::File::create(Config::path())?;
		file.write_all(encrypted_content.as_bytes())?;
		Ok(())
	}

	fn path() -> PathBuf {
		let file_path = env::var("LOCALAPPDATA")
			.map(|local_app_data| PathBuf::from(local_app_data)
			.join("com.cmd-golem.infomaniak-newsletter-interface/config.dat"))
			.expect("Failed to get configuration file path");
		file_path
	}

	fn encrypt(string: &str) -> String {
		// I know that this is shit but I couldn't find better solution which is not much more complex. Now the api keys at least aren't stored as plain text
		let key: &str = "bV8n@EZO0d*[N-FeMI`J]/W7LrQLbP}>yS(ZdQ%4[GV[5<Rv644T.FQ^c!bU`D{B/nE@>nCh5*ZKTlh*?7b1[Oe(*a]%&+*6v)>6:WSa/.5]xrrf!SCv(YNN?nfjE<Vi";
		string.chars()
			.zip(key.chars().cycle())
			.map(|(c, k)| (c as u8 ^ k as u8) as char)
			.collect()
	}
}

static mut CONFIG: Option<Config> = None;

#[tauri::command]
fn change_config(data: &str) {
	// load current config or create new file
    let mut config = Config::load().expect("Failed to load configuration");
	let data_vec: Vec<ChangeConfigObj> = serde_json::from_str(data).expect("Invalid JSON");
	for update in data_vec {
		match update.property.as_str() {
			"infomaniak_secret" => config.infomaniak_secret = update.value,
			"ftp_user" => config.ftp_user = update.value,
			"ftp_password" => config.ftp_password = update.value,
			"github_secret" => config.github_secret = update.value,
			_ => (),
		}
	}
	// check informaniak secret
	if config.infomaniak_secret.chars().next().unwrap() == ':'
		|| config.infomaniak_secret.chars().last().unwrap() == ':'
		|| config.infomaniak_secret.len() < 3
		|| config.infomaniak_secret.chars().filter(|&c| c == ':').count() == 0
	{
		println!("Infomaniak Secret doesn't have a valid format");
		return
	}

	// save data and update global var
	config.save().expect("Failed to save configuration");
    unsafe { CONFIG = Some(config) };
}

#[tauri::command]
fn init_config() -> String {
	let default_config = Config {
		infomaniak_secret: "CLIENT_API:CLIENT_SECRET".to_string(),
		ftp_user: "".to_string(),
		ftp_password: "".to_string(),
		github_secret: "".to_string(),
	};

	let mut config_return = ReturnConfig {
		infomaniak_secret: false.to_owned(),
		ftp_user: false.to_owned(),
		ftp_password: false.to_owned(),
		github_secret: false.to_owned(),
	};

	let config = match Config::load() {
		Ok(config) => {
			if config.infomaniak_secret != "CLIENT_API:CLIENT_SECRET".to_string() { config_return.infomaniak_secret = true.to_owned(); }
			if config.ftp_user != "".to_string() { config_return.ftp_user = true.to_owned(); }
			if config.ftp_password != "".to_string() { config_return.ftp_password = true.to_owned(); }
			if config.github_secret != "".to_string() { config_return.github_secret = true.to_owned(); }
			config
		},
		Err(_) => {
			default_config.save().expect("Failed to save configuration");
			default_config
		}
	};
	unsafe { CONFIG = Some(config) };
	serde_json::to_string(&config_return).expect("Config could not be returned").into()
}

// #########################################################################
// newsletter function
#[tauri::command]
fn get_campaigns() -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg("https://newsletter.infomaniak.com/api/v1/public/campaign")
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn get_campaign(id: i32) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn create_campaign(data: &str) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
        .arg("-X").arg("DELETE")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn test_campaign(id: i32, data: &str) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}/test", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/campaign/{}/send", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
        .arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn get_mailinglists() -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
        .arg("-X").arg("DELETE")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn mailinglist_get_contacts(id: i32) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/contact", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/importcontact", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/managecontact", id);

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
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
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");

	let output = Command::new("curl")
        .arg("-u").arg(&config.infomaniak_secret)
        .arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg("https://newsletter.infomaniak.com/api/v1/public/credit")
        .output()
        .expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

// #########################################################################
// main function
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![open_link, change_config, init_config, get_campaigns, get_campaign, create_campaign, update_campaign, delete_campaign, test_campaign, send_campaign, get_mailinglists, create_mailinglist, update_mailinglist, delete_mailinglist, mailinglist_get_contacts, mailinglist_add_contact, mailinglist_remove_contact, get_credits])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
