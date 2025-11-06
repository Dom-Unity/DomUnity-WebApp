fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Check if proto directory exists at different locations
    // In Docker: ./proto (same level as workspace)
    // Locally: ../proto (parent directory)
    let proto_path = if std::path::Path::new("./proto").exists() {
        "./proto"
    } else {
        "../proto"
    };
    
    tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .compile(
            &[
                &format!("{}/api/v1/auth.proto", proto_path),
                &format!("{}/api/v1/contact.proto", proto_path),
                &format!("{}/api/v1/offer.proto", proto_path),
            ],
            &[proto_path],
        )?;
    Ok(())
}
