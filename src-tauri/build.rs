fn main() {
    let dist_dir = std::path::Path::new("../dist");
    if !dist_dir.exists() {
        let _ = std::fs::create_dir_all(dist_dir);
        let index_file = dist_dir.join("index.html");
        if !index_file.exists() {
            let _ = std::fs::write(index_file, "<!doctype html><html><body></body></html>");
        }
    }

    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!("cargo:rerun-if-changed=icons/icon.png");
    println!("cargo:rerun-if-changed=icons/32x32.png");
    println!("cargo:rerun-if-changed=icons/128x128.png");
    println!("cargo:rerun-if-changed=tauri.conf.json");

    #[cfg(windows)]
    {
        let mut windows = tauri_build::WindowsAttributes::new();
        windows = windows.window_icon_path("icons/icon.ico");
        windows = windows.app_manifest(r#"
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <dependency>
    <dependentAssembly>
      <assemblyIdentity
        type="win32"
        name="Microsoft.Windows.Common-Controls"
        version="6.0.0.0"
        processorArchitecture="*"
        publicKeyToken="6595b64144ccf1df"
        language="*"
      />
    </dependentAssembly>
  </dependency>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false" />
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
"#);

        tauri_build::try_build(
            tauri_build::Attributes::new().windows_attributes(windows)
        ).expect("failed to run tauri build script");
    }

    #[cfg(not(windows))]
    {
        tauri_build::build()
    }
}
