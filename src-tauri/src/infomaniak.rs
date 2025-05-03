use std::{
	process::Command,
	os::windows::process::CommandExt
};

use crate::storage::CONFIG;

#[tauri::command]
pub fn get_campaigns(test: String) -> String {
	let config = CONFIG.lock().unwrap();
    let output = Command::new("curl")
		.arg("-G")
		.arg(format!("https://api.infomaniak.com/1/newsletters/{}}/campaigns", config.infomaniak_domain))
        .arg("-H")
        .arg(format!("Authorization: Bearer {}", config.infomaniak_secret))
        .arg("-H")
        .arg("Content-Type: application/json")
        
        .creation_flags(0x08000000)
        .output();

	return output.into();
}
