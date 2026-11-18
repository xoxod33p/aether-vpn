use tauri::State;
use tracing::{info, warn};

use crate::models::{Profile, Subscription};
use crate::network::SubscriptionParser;
use crate::storage::Database;

#[tauri::command]
pub async fn get_subscriptions(db: State<'_, Database>) -> Result<Vec<Subscription>, String> {
    db.get_subscriptions().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_subscription(subscription: Subscription, db: State<'_, Database>) -> Result<Subscription, String> {
    db.save_subscription(&subscription).map_err(|e| e.to_string())?;
    Ok(subscription)
}

#[tauri::command]
pub async fn delete_subscription(id: String, db: State<'_, Database>) -> Result<(), String> {
    db.delete_subscription(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_subscription(id: String, db: State<'_, Database>) -> Result<Vec<Profile>, String> {
    let subscriptions = db.get_subscriptions().map_err(|e| e.to_string())?;
    let mut sub = subscriptions.into_iter().find(|s| s.id == id)
        .ok_or_else(|| format!("Subscription not found: {}", id))?;

    info!("Updating subscription: '{}' ({})", sub.name, sub.url);

    match SubscriptionParser::fetch_and_parse(&sub).await {
        Ok(profiles) => {
            let count = profiles.len();
            info!("Successfully parsed {} profiles from subscription '{}'", count, sub.name);

            let _ = db.delete_profiles_by_subscription(&sub.id);

            for p in &profiles {
                if let Err(err) = db.save_profile(p) {
                    warn!("Failed to save imported profile {}: {}", p.name, err);
                }
            }

            sub.profile_count = count as u32;
            sub.last_status = "success".to_string();
            sub.last_updated_at = Some(chrono::Utc::now().to_rfc3339());
            let _ = db.save_subscription(&sub);

            Ok(profiles)
        }
        Err(err) => {
            warn!("Failed to update subscription '{}': {}", sub.name, err);
            sub.last_status = format!("error: {}", err);
            sub.last_updated_at = Some(chrono::Utc::now().to_rfc3339());
            let _ = db.save_subscription(&sub);
            Err(err)
        }
    }
}
