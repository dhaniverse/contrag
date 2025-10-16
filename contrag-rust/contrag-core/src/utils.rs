/// Utility functions for ContRAG

/// Generate a unique ID for vectors
pub fn generate_vector_id(entity_type: &str, entity_id: &str, chunk_index: usize) -> String {
    format!("{}::{}::chunk_{}", entity_type, entity_id, chunk_index)
}

/// Get current timestamp in nanoseconds (ICP time)
pub fn get_timestamp() -> u64 {
    #[cfg(target_family = "wasm")]
    {
        ic_cdk::api::time()
    }
    
    #[cfg(not(target_family = "wasm"))]
    {
        use std::time::{SystemTime, UNIX_EPOCH};
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos() as u64
    }
}

/// Sanitize text for embedding (remove excessive whitespace, etc.)
pub fn sanitize_text(text: &str) -> String {
    text.split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

/// Truncate text to max length
pub fn truncate_text(text: &str, max_len: usize) -> String {
    if text.len() <= max_len {
        text.to_string()
    } else {
        format!("{}...", &text[..max_len])
    }
}

/// Format bytes to human-readable string
pub fn format_bytes(bytes: u64) -> String {
    const UNITS: &[&str] = &["B", "KB", "MB", "GB", "TB"];
    let mut size = bytes as f64;
    let mut unit_idx = 0;

    while size >= 1024.0 && unit_idx < UNITS.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }

    format!("{:.2} {}", size, UNITS[unit_idx])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_vector_id() {
        let id = generate_vector_id("User", "123", 0);
        assert_eq!(id, "User::123::chunk_0");
    }

    #[test]
    fn test_sanitize_text() {
        let text = "Hello    world\n\n  test";
        let sanitized = sanitize_text(text);
        assert_eq!(sanitized, "Hello world test");
    }

    #[test]
    fn test_truncate_text() {
        let text = "Hello world";
        assert_eq!(truncate_text(text, 5), "Hello...");
        assert_eq!(truncate_text(text, 100), "Hello world");
    }

    #[test]
    fn test_format_bytes() {
        assert_eq!(format_bytes(512), "512.00 B");
        assert_eq!(format_bytes(1536), "1.50 KB");
        assert_eq!(format_bytes(1_048_576), "1.00 MB");
    }
}
