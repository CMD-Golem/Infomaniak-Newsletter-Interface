use std::{
	process::Command,
	os::windows::process::CommandExt
};

use crate::storage::CONFIG;

#[tauri::command]
pub fn get(dir: String) -> String {
	let config = CONFIG.lock().unwrap();
	let output = Command::new("curl")
		.arg("-X")
		.arg("PROPFIND")
		.arg(format!("{}/{}", config.webdav_url, dir))
		.arg("-u")
		.arg(format!("{}:{}", config.webdav_username, config.webdav_password))
		.arg("--digest")
		.arg("-H")
		.arg("Content-Type: application/xml")
		
		.creation_flags(0x08000000)
		.output();

	match output {
		Ok(success) => String::from_utf8_lossy(&success.stdout).into(),
		Err(err) => err.to_string()
	}
}

#[tauri::command]
pub fn delete(path: String) -> String {
	let config = CONFIG.lock().unwrap();
	let output = Command::new("curl")
		.arg("-X")
		.arg("DELETE")
		.arg(format!("{}/{}", config.webdav_url, path))
		.arg("-u")
		.arg(format!("{}:{}", config.webdav_username, config.webdav_password))
		.arg("--digest")
		
		.creation_flags(0x08000000)
		.output();

	match output {
		Ok(success) => String::from_utf8_lossy(&success.stdout).into(),
		Err(err) => err.to_string()
	}
}

#[tauri::command]
pub fn post(local_path: String, online_path: String) -> String {
	let config = CONFIG.lock().unwrap();
	let output = Command::new("curl")
		.arg(format!("{}/{}", config.webdav_url, online_path))
		.arg("-T")
		.arg(local_path)
		.arg("-u")
		.arg(format!("{}:{}", config.webdav_username, config.webdav_password))
		.arg("--digest")
		
		.creation_flags(0x08000000)
		.output();

	match output {
		Ok(success) => String::from_utf8_lossy(&success.stdout).into(),
		Err(err) => err.to_string()
	}
}