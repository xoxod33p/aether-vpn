use tauri::State;
use crate::models::RoutingRule;
use crate::storage::Database;

#[tauri::command]
pub async fn get_routing_rules(db: State<'_, Database>) -> Result<Vec<RoutingRule>, String> {
    db.get_routing_rules().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_routing_rule(rule: RoutingRule, db: State<'_, Database>) -> Result<RoutingRule, String> {
    db.save_routing_rule(&rule).map_err(|e| e.to_string())?;
    Ok(rule)
}

#[tauri::command]
pub async fn delete_routing_rule(id: String, db: State<'_, Database>) -> Result<(), String> {
    db.delete_routing_rule(&id).map_err(|e| e.to_string())
}
