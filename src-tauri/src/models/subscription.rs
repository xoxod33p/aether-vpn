use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Subscription {
    pub id: String,
    pub name: String,
    pub url: String,
    pub format: String,
    pub auto_update: bool,
    pub update_interval_hours: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_updated_at: Option<String>,
    pub last_status: String,
    pub profile_count: u32,
    pub created_at: String,
}
