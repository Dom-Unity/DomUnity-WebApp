fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Check if proto directory exists at different locations
    // In Docker: ./proto (same level as workspace)
    // Locally: ../proto (parent directory)
    let proto_path = if std::path::Path::new("./proto").exists() {
        "./proto"
    } else {
        "../proto"
    };

    let proto_files = vec![
        format!("{}/api/v1/auth.proto", proto_path),
        format!("{}/api/v1/contact.proto", proto_path),
        format!("{}/api/v1/offer.proto", proto_path),
    ];

    tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .file_descriptor_set_path(
            std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("api_descriptor.bin"),
        )
        .compile(
            &proto_files.iter().map(|s| s.as_str()).collect::<Vec<_>>(),
            &[proto_path],
        )?;
    Ok(())
}
