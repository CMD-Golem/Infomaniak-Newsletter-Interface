use tauri::{Manager, WindowEvent::Destroyed};
use std::{fs, env};

mod storage;
mod infomaniak;
mod webdav;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![
			infomaniak::get_campaigns,
			storage::change_config,
			storage::get_config
			])
		.plugin(tauri_plugin_window_state::Builder::new().build())
		.plugin(tauri_plugin_updater::Builder::new().build())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_opener::init())
		.setup(|app| {
			// clear temp folder
			let window = app.get_webview_window("main").unwrap();
			window.on_window_event(|event| {
				if let Destroyed = event {
					let temp = env::var("TEMP").expect("Failed to get configuration file path");
					let folder_path = format!("{temp}/com.cmd-golem.infomaniak-newsletter-interface");
					let _ = fs::remove_dir_all(folder_path);
				}
			});
			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
