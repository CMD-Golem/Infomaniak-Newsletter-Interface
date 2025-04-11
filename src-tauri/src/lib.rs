#[cfg_attr(mobile, tauri::mobile_entry_point)]

use tauri::Manager;

pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_updater::Builder::new().build())
		.plugin(tauri_plugin_store::Builder::new().build())
		.plugin(tauri_plugin_window_state::Builder::new().build())
		.setup(|app| {
			if cfg!(debug_assertions) {
				app.handle().plugin(
					tauri_plugin_log::Builder::default()
						.level(log::LevelFilter::Info)
						.build(),
				)?;
			}
			Ok(())
		})
		.setup(|app| {
			let salt_path = app
				.path()
				.app_local_data_dir()
				.expect("could not resolve app local data path")
				.join("salt.txt");
			app.handle().plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}
