use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let quit = MenuItem::with_id(app, "quit", "Quit Trace", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;

            let mut builder = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Trace prototype")
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                });

            if let Some(icon) = app.default_window_icon().cloned() {
                builder = builder.icon(icon);
            }

            builder.build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
