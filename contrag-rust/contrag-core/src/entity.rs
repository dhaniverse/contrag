use candid::CandidType;
use serde::Serialize;
pub use crate::types::{EntityRelationship, RelationshipType};

/// Trait that marks a struct as a RAG entity
/// 
/// Implement this trait for your canister data structures to enable
/// automatic context building and relationship mapping.
/// 
/// # Example
/// 
/// ```rust
/// use contrag_core::prelude::*;
/// use candid::{CandidType, Deserialize};
/// use serde::Serialize;
/// 
/// #[derive(CandidType, Deserialize, Serialize, Clone)]
/// pub struct User {
///     pub id: String,
///     pub name: String,
///     pub email: String,
/// }
/// 
/// impl RagEntity for User {
///     fn entity_type() -> &'static str {
///         "User"
///     }
///     
///     fn entity_id(&self) -> String {
///         self.id.clone()
///     }
///     
///     fn to_context_map(&self) -> Vec<(String, String)> {
///         vec![
///             ("id".to_string(), self.id.clone()),
///             ("name".to_string(), self.name.clone()),
///             ("email".to_string(), self.email.clone()),
///         ]
///     }
///     
///     fn relationships(&self) -> Vec<EntityRelationship> {
///         vec![]
///     }
/// }
/// ```
pub trait RagEntity: CandidType + Serialize + Clone {
    /// Returns the entity type identifier
    fn entity_type() -> &'static str
    where
        Self: Sized;

    /// Returns the unique identifier for this entity instance
    fn entity_id(&self) -> String;

    /// Converts the entity to a flat key-value representation
    /// 
    /// Use dot notation for nested fields: "profile.age"
    fn to_context_map(&self) -> Vec<(String, String)>;

    /// Returns relationships to other entities
    fn relationships(&self) -> Vec<EntityRelationship>;

    /// Converts the entity to a human-readable text representation
    /// 
    /// Override this for custom formatting. Default implementation
    /// joins the context map entries.
    fn to_text(&self) -> String {
        let mut lines = vec![
            format!("Entity: {}", Self::entity_type()),
            format!("ID: {}", self.entity_id()),
            String::from("---"),
        ];

        for (key, value) in self.to_context_map() {
            lines.push(format!("{}: {}", key, value));
        }

        lines.join("\n")
    }

    /// Returns a summary of the entity (first N characters)
    fn to_summary(&self, max_length: usize) -> String {
        let text = self.to_text();
        if text.len() <= max_length {
            text
        } else {
            format!("{}...", &text[..max_length])
        }
    }
}

/// Helper function to flatten nested JSON-like structures using serde_json
/// 
/// This is useful when you have complex nested structs and want to
/// automatically flatten them for context building.
/// 
/// # Example
/// 
/// ```rust
/// use serde_json::json;
/// use contrag_core::entity::flatten_json_to_context;
/// 
/// let data = json!({
///     "user": {
///         "name": "Alice",
///         "profile": {
///             "age": 30,
///             "location": "NYC"
///         }
///     }
/// });
/// 
/// let flattened = flatten_json_to_context(&data, "");
/// // Results in:
/// // [
/// //   ("user.name", "Alice"),
/// //   ("user.profile.age", "30"),
/// //   ("user.profile.location", "NYC")
/// // ]
/// ```
pub fn flatten_json_to_context(
    value: &serde_json::Value,
    prefix: &str,
) -> Vec<(String, String)> {
    let mut result = vec![];

    match value {
        serde_json::Value::Object(map) => {
            for (key, val) in map {
                let new_prefix = if prefix.is_empty() {
                    key.clone()
                } else {
                    format!("{}.{}", prefix, key)
                };
                result.extend(flatten_json_to_context(val, &new_prefix));
            }
        }
        serde_json::Value::Array(arr) => {
            let items: Vec<String> = arr
                .iter()
                .map(|v| match v {
                    serde_json::Value::String(s) => s.clone(),
                    _ => v.to_string(),
                })
                .collect();
            result.push((prefix.to_string(), items.join(", ")));
        }
        serde_json::Value::Null => {
            result.push((prefix.to_string(), String::new()));
        }
        _ => {
            result.push((prefix.to_string(), value.to_string().trim_matches('"').to_string()));
        }
    }

    result
}

/// Helper macro to implement RagEntity with automatic flattening
/// 
/// This macro uses serde_json to automatically flatten your struct,
/// which is useful for rapid prototyping or complex nested structures.
#[macro_export]
macro_rules! impl_rag_entity_auto {
    ($struct_name:ident, $entity_type:expr, $id_field:ident) => {
        impl RagEntity for $struct_name {
            fn entity_type() -> &'static str {
                $entity_type
            }

            fn entity_id(&self) -> String {
                self.$id_field.clone()
            }

            fn to_context_map(&self) -> Vec<(String, String)> {
                let json = serde_json::to_value(self).unwrap();
                $crate::entity::flatten_json_to_context(&json, "")
            }

            fn relationships(&self) -> Vec<EntityRelationship> {
                vec![]
            }
        }
    };
}
