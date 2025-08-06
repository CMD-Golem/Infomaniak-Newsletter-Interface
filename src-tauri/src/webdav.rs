use std::{env, fs};
use reqwest::{self, header::CONTENT_TYPE, Method};

use crate::storage::CONFIG;

// ToDo: Check js errorhandling

#[tauri::command]
pub async fn get(dir: String) -> Result<String, String> {
	let config = CONFIG.lock().unwrap().clone();

	let client = reqwest::Client::new();
	let request = client.request(Method::from_bytes(b"PROPFIND").unwrap(), format!("{}/{}", config.webdav_url, dir))
		.basic_auth(config.webdav_username, Some(config.webdav_password))
		.send().await.map_err(|e| e.without_url().to_string())?
		.text().await.map_err(|e| e.without_url().to_string())?;

	return Ok(request);
}

#[tauri::command]
pub async fn delete(path: String) -> Result<String, String> {
	let config = CONFIG.lock().unwrap().clone();

	let client = reqwest::Client::new();
	let request = client.request(Method::DELETE, format!("{}/{}", config.webdav_url, path))
		.basic_auth(config.webdav_username, Some(config.webdav_password))
		.send().await.map_err(|e| e.without_url().to_string())?
		.text().await.map_err(|e| e.without_url().to_string())?;

	return Ok(request);
}

#[tauri::command]
pub async fn post(local_path: String, online_path: String, is_temp: bool) -> Result<String, String> {
	let config = CONFIG.lock().unwrap().clone();

	let file;

	if is_temp {
		let temp = env::var("TEMP").expect("Failed to get configuration file path");
		file = fs::read(format!("{temp}/{local_path}"));
	}
	else {
		file = fs::read(local_path);
	}

	let client = reqwest::Client::new();
	let request = client.request(Method::PUT, format!("{}/{}", config.webdav_url, online_path))
		.header(CONTENT_TYPE, "application/octet-stream")
		.basic_auth(config.webdav_username, Some(config.webdav_password))
		.body(file.map_err(|e| e.to_string())?)
		.send().await.map_err(|e| e.without_url().to_string())?
		.text().await.map_err(|e| e.without_url().to_string())?;

	return Ok(request);
}
