use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::{
	env, fs,
	io::{Write, Error},
	path::PathBuf,
	sync::Mutex,
	error,
};

// config storage functions
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(default)]
pub struct Config {
	pub infomaniak_secret: String,
	pub infomaniak_domain: String,
	pub webdav_url: String,
	pub webdav_username: String,
	pub webdav_password: String,
	public_url: String,
	sender_name: String,
	sender_email: String,
	lang: String,
	unsubscribe: String,
	file_text: String,
	test_email: String,
	copy_text: String,
}

impl Default for Config {
	fn default() -> Self {
		Self {
			infomaniak_secret: String::new(),
			infomaniak_domain: String::new(),
			webdav_url: String::new(),
			webdav_username: String::new(),
			webdav_password: String::new(),
			public_url: String::new(),
			sender_name: String::new(),
			sender_email: String::new(),
			lang: "de_DE".to_string(),
			unsubscribe: String::new(),
			file_text: String::new(),
			test_email: String::new(),
			copy_text: String::new(),
		}
	}
}

impl Config {
	fn load() -> Config {
		return match Config::decrypt() {
			Ok(content) => content,
			Err(_) => return Config::default(),
		};
	}

	fn decrypt() -> Result<Config, Box<dyn error::Error>> {
		let path = Config::path()?;
		let file = fs::read_to_string(path);
		let decrypted_content = Config::encrypt(&file?);
		let config: Config = serde_json::from_str(&decrypted_content)?;
		return Ok(config);
	}

	fn store(&mut self) -> Result<(), Error> {
		let config_content = serde_json::to_string_pretty(self)?;
		let encrypted_content = Config::encrypt(&config_content);
		let mut file = fs::File::create(Config::path()?)?;
		file.write_all(encrypted_content.as_bytes())?;
		return Ok(());
	}

	fn path() -> Result<PathBuf, Error> {
		let path = env::var("APPDATA").expect("Could find folder");
		let full_path = format!("{path}/com.cmd-golem.infomaniak-newsletter-interface");
		
		if !fs::exists(&full_path)? {
			fs::create_dir(&full_path)?;
		}

		return Ok(PathBuf::from(format!("{path}/com.cmd-golem.infomaniak-newsletter-interface/config.dat")));
	}

	fn encrypt(string: &str) -> String {
		// I know that this is shit but I had no time to implement iota stronghold
		let key: &str = "bV8n@EZO0d*[N-FeMI`J]/W7LrQLbP}>yS(ZdQ%4[GV[5<Rv644T.FQ^c!bU`D{B/nE@>nCh5*ZKTlh*?7b1[Oe(*a]%&+*6v)>6:WSa/.5]xrrf!SCv(YNN?nfjE<Vi";
		return string.chars().zip(key.chars().cycle()).map(|(c, k)| (c as u8 ^ k as u8) as char).collect();
	}
}


#[derive(Debug, Deserialize)]
struct ChangeConfigObj {
	property: String,
	value: String,
}

pub static CONFIG: Lazy<Mutex<Config>> = Lazy::new(|| Mutex::new(Config::load()));

#[tauri::command]
pub fn change_config(data: &str) -> Result<String, String> {
	let mut config = CONFIG.lock().unwrap();
	let data_vec: Vec<ChangeConfigObj> = serde_json::from_str(data).map_err(|e| e.to_string())?;

	for update in data_vec {
		match update.property.as_str() {
			"infomaniak_secret" => config.infomaniak_secret = update.value,
			"infomaniak_domain" => config.infomaniak_domain = update.value,
			"webdav_url" => config.webdav_url = update.value,
			"webdav_username" => config.webdav_username = update.value,
			"webdav_password" => config.webdav_password = update.value,
			"public_url" => config.public_url = update.value,
			"sender_name" => config.sender_name = update.value,
			"sender_email" => config.sender_email = update.value,
			"lang" => config.lang = update.value,
			"unsubscribe" => config.unsubscribe = update.value,
			"file_text" => config.file_text = update.value,
			"test_email" => config.test_email = update.value,
			"copy_text" => config.copy_text = update.value,
			_ => (),
		}
	}

	let status = match config.store() {
		Ok(_) => "success".to_string(),
		Err(err) => err.to_string(),
	};

	return Ok(status);
}

#[tauri::command]
pub fn get_config() -> Result<String, String> {
	let config = CONFIG.lock().unwrap();
	let mut return_config = config.clone();

	if config.infomaniak_secret == String::new() {
		return_config.infomaniak_secret = "false".to_string()
	} else {
		return_config.infomaniak_secret = "true".to_string()
	}

	if config.webdav_password == String::new() {
		return_config.webdav_password = "false".to_string()
	} else {
		return_config.webdav_password = "true".to_string()
	}

	let json = serde_json::to_string(&return_config).map_err(|e|
		format!("{{\"status\":\"error\",\"error\":\"{}\"}}", e.to_string())
	)?;
	
	return Ok(json);
}
