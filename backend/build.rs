fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .compile(
            &[
                "../proto/api/v1/auth.proto",
                "../proto/api/v1/contact.proto",
                "../proto/api/v1/offer.proto",
            ],
            &["../proto"],
        )?;
    Ok(())
}
