use std::{env, fs};
use tauri::{Manager, WindowEvent::Destroyed};
use tauri_plugin_updater::UpdaterExt;
use tauri_plugin_prevent_default::{Flags, PlatformOptions};

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
		.plugin(prevent_default())
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

			// updater
			let handle = app.handle().clone();
			tauri::async_runtime::spawn(async move {
				if let Ok(Some(update)) = handle.updater().unwrap().check().await {
					update.download_and_install(|_, _| {}, || {}).await.unwrap();
					handle.restart();
				}
			});

			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}

fn prevent_default() -> tauri::plugin::TauriPlugin<tauri::Wry> {
	tauri_plugin_prevent_default::Builder::new()
		.with_flags(Flags::all().difference(Flags::DEV_TOOLS | Flags::RELOAD | Flags::FIND))
		.platform(PlatformOptions::new()
			.general_autofill(false)
			.password_autosave(false)
		)
		.build()
}