use tauri::Manager;
use std::os::windows::process::CommandExt;
use std::process::Command;

mod infomaniak;
mod webdav;

#[tauri::command]
fn open_link(url: &str) -> String {
	let output = Command::new("cmd")
		.args(&["/C", "start", url])
		.creation_flags(0x08000000)
		.output()
		.expect("Failed to open URL");

	String::from_utf8_lossy(&output.stdout).into()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.invoke_handler(tauri::generate_handler![
			infomaniak::get_campaigns,
			open_link
			])
		.plugin(tauri_plugin_window_state::Builder::new().build())
		.plugin(tauri_plugin_updater::Builder::new().build())
		.plugin(tauri_plugin_dialog::init())
		.plugin(tauri_plugin_fs::init())
		.plugin(tauri_plugin_clipboard_manager::init())
		.plugin(tauri_plugin_opener::init())
		.setup(|app| {
			let salt_path = app
				.path()
				.app_local_data_dir()
				.expect("could not resolve app local data path")
				.join("salt.txt");
			app.handle()
				.plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
