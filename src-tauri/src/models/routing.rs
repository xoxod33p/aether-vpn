use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RoutingAction {
    Direct,
    Proxy,
    Block,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RoutingRuleType {
    Domain,
    DomainSuffix,
    IpCidr,
    Country,
    Protocol,
    Port,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutingRule {
    pub id: String,
    pub name: String,
    pub rule_type: RoutingRuleType,
    pub rule_value: String,
    pub action: RoutingAction,
    pub priority: i32,
    pub is_enabled: bool,
    pub created_at: String,
}
