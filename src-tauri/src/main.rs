// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::io::{self, Write};
use serde::{Deserialize, Serialize};
use std::os::windows::process::CommandExt;




#[tauri::command]
fn open_link(url: &str) -> String {
	let output = Command::new("cmd")
		.args(&["/C", "start", url])
		.creation_flags(0x08000000)
		.output()
		.expect("Failed to open URL");

	String::from_utf8_lossy(&output.stdout).into()
}

// #########################################################################
// config storage functions
#[derive(Serialize, Deserialize, Debug)]
struct Config {
	infomaniak_secret: String,
	ftp_user: String,
	ftp_password: String,
	github_secret: String,
	newsletter: NewsletterConfig,
}

#[derive(Serialize, Deserialize, Debug)]
struct ReturnConfig {
	result: String,
	error: String,
	infomaniak_secret: bool,
	ftp_user: bool,
	ftp_password: bool,
	github_secret: bool,
	newsletter: NewsletterConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct NewsletterConfig {
	email_from_name: String,
	lang: String,
	email_from_addr: String,
	test_email: String,
	unsubscribe: String,
	github_path: String,
}

#[derive(Debug, Deserialize)]
struct ChangeConfigObj {
	property: String,
	value: String,
}

impl Config {
	fn default() -> Config {
		let default_config = Config {
			infomaniak_secret: "API_KEY:SECRET_KEY".to_string(),
			ftp_user: "".to_string(),
			ftp_password: "".to_string(),
			github_secret: "".to_string(),
			newsletter: NewsletterConfig {
				email_from_name: "".to_string(),
				lang: "".to_string(),
				email_from_addr: "".to_string(),
				test_email: "".to_string(),
				unsubscribe: "".to_string(),
				github_path: "".to_string(),
			},
		};

		default_config
	}

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
fn change_config(data: &str) -> String {
	let mut return_value = "false".to_string();

	// load current config or create new file
	match Config::load() {
		Ok(mut config) => {
			let data_vec: Vec<ChangeConfigObj> = serde_json::from_str(data).expect("Invalid JSON");

			for update in data_vec {
				match update.property.as_str() {
					"infomaniak_secret" => config.infomaniak_secret = update.value,
					"ftp_user" => config.ftp_user = update.value,
					"ftp_password" => config.ftp_password = update.value,
					"github_secret" => config.github_secret = update.value,
					"email_from_name" => config.newsletter.email_from_name = update.value,
					"lang" => config.newsletter.lang = update.value,
					"email_from_addr" => config.newsletter.email_from_addr = update.value,
					"test_email" => config.newsletter.test_email = update.value,
					"unsubscribe" => config.newsletter.unsubscribe = update.value,
					"github_path" => config.newsletter.github_path = update.value,
					_ =>  ()
				}
			}

			// check informaniak secret
			if config.infomaniak_secret.chars().next().unwrap() == ':'
				|| config.infomaniak_secret.chars().last().unwrap() == ':'
				|| config.infomaniak_secret.len() < 3
				|| config.infomaniak_secret.chars().filter(|&c| c == ':').count() == 0
			{
				return_value = "Infomaniak Secret does not have a valid format".to_string();
			}
			// save data and update global var
			else if return_value == "false".to_string() {				
				config.save().unwrap_or_else(|e| {
					return_value = e.to_string();
				});
				unsafe { CONFIG = Some(config) };
			}
		}
		Err(e) => {
			return_value = e.to_string();
		}
	};
	
	return_value.into()
}

#[tauri::command]
fn init_config(init: bool) -> String {
	// prepare return object to now on the front end if secrets are defined
	let mut config_return = ReturnConfig {
		result: "error".to_string(),
		error: "".to_string(),
		infomaniak_secret: false.to_owned(),
		ftp_user: false.to_owned(),
		ftp_password: false.to_owned(),
		github_secret: false.to_owned(),
		newsletter: NewsletterConfig {
			email_from_name: "".to_string(),
			lang: "".to_string(),
			email_from_addr: "".to_string(),
			test_email: "".to_string(),
			unsubscribe: "".to_string(),
			github_path: "".to_string(),
		},
	};

	let config = match Config::load() {
		Ok(config) => {
			// load config from file and set secrets to true for front_end
			if config.infomaniak_secret != "API_KEY:SECRET_KEY".to_string() { config_return.infomaniak_secret = true.to_owned(); }
			if config.ftp_user != "".to_string() { config_return.ftp_user = true.to_owned(); }
			if config.ftp_password != "".to_string() { config_return.ftp_password = true.to_owned(); }
			if config.github_secret != "".to_string() { config_return.github_secret = true.to_owned(); }
			config_return.result = "success".to_string();
			config_return.newsletter = config.newsletter.clone();
			config
		},
		Err(_) => {
			// load default config
			Config::default().save().unwrap_or_else(|e| {
				config_return.error = e.to_string();
			});

			config_return.result = "loaded_default".to_string();
			Config::default()
		}
	};

	// set global config and return to front end
	if init {unsafe { CONFIG = Some(config) };}
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn create_mailinglist(data: &str) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");

	let output = Command::new("curl")
		.arg("-u").arg(&config.infomaniak_secret)
		.arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg("https://newsletter.infomaniak.com/api/v1/public/mailinglist")
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn update_mailinglist(id: i32, data: &str) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}", id);

	let output = Command::new("curl")
		.arg("-u").arg(&config.infomaniak_secret)
		.arg("-X").arg("PUT")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn mailinglist_add_contact(id: i32, data: &str) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/importcontact", id);

	let output = Command::new("curl")
		.arg("-u").arg(&config.infomaniak_secret)
		.arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn mailinglist_remove_contact(id: i32, data: &str) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/mailinglist/{}/managecontact", id);

	let output = Command::new("curl")
		.arg("-u").arg(&config.infomaniak_secret)
		.arg("-X").arg("POST")
		.arg("-H").arg("Content-Type: application/json")
		.arg("-d").arg(data)
		.arg(&url)
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn get_contact(id: i32) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/contact/{}", id);

	let output = Command::new("curl")
		.arg("-u").arg(&config.infomaniak_secret)
		.arg("-X").arg("GET")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn delete_contact(id: i32) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let url: String = format!("https://newsletter.infomaniak.com/api/v1/public/contact/{}", id);

	let output = Command::new("curl")
		.arg("-u").arg(&config.infomaniak_secret)
		.arg("-X").arg("DELETE")
		.arg("-H").arg("Content-Type: application/json")
		.arg(&url)
		.creation_flags(0x08000000)
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
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

// #########################################################################
// upload to github
#[tauri::command]
fn github_get(id: String) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let secret: String = format!("Authorization: Bearer {}", config.github_secret);
	let github = &config.newsletter.github_path;
	
	let url: String = format!("https://uploads.github.com/repos/{github}/releases/tags/{id}");
	
	let output = Command::new("curl")
		.arg("-L")
		.arg("-H").arg("Accept: application/vnd.github+json")
		.arg("-H").arg(&secret)
		.arg(url)
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn github_create(data: String) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let secret: String = format!("Authorization: Bearer {}", config.github_secret);
	let github = &config.newsletter.github_path;
	
	let url: String = format!("https://uploads.github.com/repos/{github}/releases/");
	
	let output = Command::new("curl")
		.arg("-L")
		.arg("-X").arg("POST")
		.arg("-H").arg("Accept: application/vnd.github+json")
		.arg("-H").arg(&secret)
		.arg(url)
		.arg("-d").arg(data)
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn github_upload_file(id: String, file_path: String, file_name: String) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let secret: String = format!("Authorization: Bearer {}", config.github_secret);
	let github = &config.newsletter.github_path;

	let url: String = format!("https://uploads.github.com/repos/{github}/releases/{id}/assets?name={file_name}");
	
	let output = Command::new("curl")
		.arg("-L")
		.arg("-X").arg("POST")
		.arg("-H").arg("Accept: application/vnd.github+json")
		.arg("-H").arg(&secret)
		.arg("-H").arg("Content-Type: application/octet-stream")
		.arg(url)
		.arg("--data-binary").arg(format!("@{}", file_path))
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn github_remove_file(id: String) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let secret: String = format!("Authorization: Bearer {}", config.github_secret);
	let github = &config.newsletter.github_path;
	
	let url: String = format!("https://uploads.github.com/repos/{github}/releases/assets/{id}");
	
	let output = Command::new("curl")
		.arg("-L")
		.arg("-X").arg("DELETE")
		.arg("-H").arg("Accept: application/vnd.github+json")
		.arg("-H").arg(&secret)
		.arg(url)
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}

#[tauri::command]
fn github_delete(id: String) -> String {
	let config = unsafe { CONFIG.as_ref() }.expect("Config not loaded");
	let secret: String = format!("Authorization: Bearer {}", config.github_secret);
	let github = &config.newsletter.github_path;
	
	let url: String = format!("https://uploads.github.com/repos/{github}/releases/{id}");
	
	let output = Command::new("curl")
		.arg("-L")
		.arg("-X").arg("DELETE")
		.arg("-H").arg("Accept: application/vnd.github+json")
		.arg("-H").arg(&secret)
		.arg(url)
		.creation_flags(0x08000000)
		.output()
		.expect("Error");

	String::from_utf8_lossy(&output.stdout).into()
}



// #########################################################################
// main function
fn main() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![open_link, change_config, init_config, get_campaigns, get_campaign, create_campaign, update_campaign, delete_campaign, test_campaign, send_campaign, get_mailinglists, create_mailinglist, update_mailinglist, delete_mailinglist, mailinglist_get_contacts, mailinglist_add_contact, mailinglist_remove_contact, get_contact, delete_contact, get_credits, github_get, github_create, github_upload_file, github_remove_file, github_delete])
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
