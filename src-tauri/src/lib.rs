use std::{env, fs};
use tauri::{Manager, WindowEvent::Destroyed};

mod infomaniak;
mod storage;
mod webdav;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![
			storage::change_config,
			storage::get_config,
			infomaniak::get_campaigns,
			infomaniak::get_campaign,
			infomaniak::get_campaign_content,
			infomaniak::create_campaign,
			infomaniak::update_campaign,
			infomaniak::delete_campaign,
			infomaniak::test_campaign,
			infomaniak::send_campaign,
			infomaniak::get_mailinglists,
			infomaniak::create_mailinglist,
			infomaniak::update_mailinglist,
			infomaniak::delete_mailinglist,
			infomaniak::mailinglist_get_contacts,
			infomaniak::mailinglist_assign_contacts,
			infomaniak::mailinglist_add_contact,
			infomaniak::mailinglist_remove_contact,
			infomaniak::get_credits,
			webdav::get,
			webdav::delete,
			webdav::post
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
