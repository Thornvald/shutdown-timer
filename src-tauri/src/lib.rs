#[tauri::command]
fn set_shutdown_timer(minutes: u64) -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;
    
    let seconds = minutes * 60;
    match std::process::Command::new("shutdown")
        .args(&["/s", "/t", &seconds.to_string()])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn() {
            Ok(_) => Ok(format!("Shutdown scheduled in {} minutes.", minutes)),
            Err(e) => Err(e.to_string())
        }
}

#[tauri::command]
fn cancel_shutdown_timer() -> Result<String, String> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    match std::process::Command::new("shutdown")
        .arg("/a")
        .creation_flags(CREATE_NO_WINDOW)
        .spawn() {
            Ok(_) => Ok("Shutdown cancelled.".to_string()),
            Err(e) => Err(e.to_string())
        }
}

#[tauri::command]
fn exit_app(app_handle: tauri::AppHandle) {
    app_handle.exit(0);
}

#[tauri::command]
fn toggle_maximize(app_handle: tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app_handle.get_webview_window("main") {
        let is_maximized = window.is_maximized().unwrap_or(false);
        if is_maximized {
            let _ = window.unmaximize();
        } else {
            let _ = window.maximize();
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![set_shutdown_timer, cancel_shutdown_timer, exit_app, toggle_maximize])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
