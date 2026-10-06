use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use tauri::State;
use url::Url;

const SERVICE: &str = "dev.vouchnet.desktop";
const ACCOUNT: &str = "refresh-token";

#[derive(Default)] struct DesktopState { pending: Mutex<Option<PendingAuthorization>>, access_token: Mutex<Option<String>> }
struct PendingAuthorization { state: String, verifier: String }
#[derive(Deserialize)] #[serde(rename_all = "camelCase")] struct TokenResponse { access_token: String, refresh_token: String }
#[derive(Deserialize, Serialize)] #[serde(rename_all = "camelCase")] struct Profile { full_name: String, headline: Option<String>, slug: String, #[serde(default)] identity_verification: Option<IdentityVerification>, #[serde(default)] early_member: bool, #[serde(default)] hourly_rate_amount: Option<String>, #[serde(default = "default_currency")] hourly_rate_currency: String, #[serde(default)] hourly_rate_visible: bool, #[serde(default)] services: Vec<ProfileService> }
#[derive(Deserialize, Serialize, Clone)] #[serde(rename_all = "camelCase")] struct ProfileService { title: String, description: Option<String>, rate_amount: Option<String>, rate_currency: String, rate_unit: String }
fn default_currency() -> String { "USD".into() }
#[derive(Deserialize, Serialize, Clone)] #[serde(rename_all = "camelCase")] struct IdentityVerification { method: String, verified_at: String }
#[derive(Deserialize)] struct ProfileResponse { profile: Option<Profile>, verification: Option<IdentityVerification>, #[serde(default)] services: Vec<ProfileService> }
#[derive(Deserialize, Serialize)] #[serde(rename_all = "camelCase")] struct DesktopAttachment { url: String, kind: String, label: Option<String>, alt_text: Option<String> }

fn base_url() -> String { std::env::var("VOUCHNET_URL").unwrap_or_else(|_| "https://vouchnet.dev".into()).trim_end_matches('/').into() }
fn random_urlsafe() -> String { let mut bytes = [0_u8; 32]; rand::thread_rng().fill_bytes(&mut bytes); URL_SAFE_NO_PAD.encode(bytes) }
fn challenge(verifier: &str) -> String { URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes())) }
fn is_uuid(value: &str) -> bool {
  value.len() == 36
    && value.chars().enumerate().all(|(index, character)| match index {
      8 | 13 | 18 | 23 => character == '-',
      _ => character.is_ascii_hexdigit(),
    })
}
fn credential() -> Result<keyring::Entry, String> { keyring::Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string()) }
fn save_refresh(value: &str) -> Result<(), String> { credential()?.set_password(value).map_err(|e| e.to_string()) }
fn load_refresh() -> Result<Option<String>, String> { match credential()?.get_password() { Ok(value) => Ok(Some(value)), Err(keyring::Error::NoEntry) => Ok(None), Err(error) => Err(error.to_string()) } }
fn clear_refresh() -> Result<(), String> { match credential()?.delete_credential() { Ok(()) | Err(keyring::Error::NoEntry) => Ok(()), Err(error) => Err(error.to_string()) } }

async fn exchange(path: &str, payload: serde_json::Value) -> Result<TokenResponse, String> {
  let response = reqwest::Client::new().post(format!("{}{}", base_url(), path)).json(&payload).send().await.map_err(|e| e.to_string())?;
  if !response.status().is_success() { return Err("VouchNet did not accept this desktop credential.".into()); }
  response.json::<TokenResponse>().await.map_err(|e| e.to_string())
}
async fn access(state: &DesktopState) -> Result<String, String> {
  if let Some(value) = state.access_token.lock().map_err(|_| "Desktop session lock failed.")?.clone() { return Ok(value); }
  let refresh = load_refresh()?.ok_or("No saved VouchNet desktop session.")?;
  let tokens = exchange("/api/desktop/token", serde_json::json!({"grantType":"refresh_token","refreshToken":refresh})).await?;
  save_refresh(&tokens.refresh_token)?;
  *state.access_token.lock().map_err(|_| "Desktop session lock failed.")? = Some(tokens.access_token.clone());
  Ok(tokens.access_token)
}
async fn profile(state: &DesktopState) -> Result<Option<Profile>, String> {
  let token = access(state).await?;
  let response = reqwest::Client::new().get(format!("{}/api/desktop/me", base_url())).bearer_auth(token).send().await.map_err(|e| e.to_string())?;
  if response.status().as_u16() == 401 { *state.access_token.lock().map_err(|_| "Desktop session lock failed.")? = None; return Err("Desktop session expired.".into()); }
  let payload = response.json::<ProfileResponse>().await.map_err(|e| e.to_string())?;
  // The badge only communicates that the member is verified plus the method and date; which
  // provider performed the check is deliberately not surfaced.
  Ok(payload.profile.map(|mut profile| { profile.identity_verification = payload.verification.clone(); profile.services = payload.services; profile }))
}
async fn authenticated_get(state: &DesktopState, path: &str) -> Result<serde_json::Value, String> {
  let token = access(state).await?;
  let response = reqwest::Client::new().get(format!("{}{}", base_url(), path)).bearer_auth(token).send().await.map_err(|_| "VouchNet is temporarily unavailable. Check your connection and retry.".to_string())?;
  if response.status().as_u16() == 401 { *state.access_token.lock().map_err(|_| "Desktop session lock failed.")? = None; return Err("Your desktop session needs to be reconnected.".into()); }
  if !response.status().is_success() { return Err("VouchNet could not complete that request.".into()); }
  response.json().await.map_err(|_| "VouchNet returned an invalid response.".into())
}
async fn authenticated_post(state: &DesktopState, path: &str, payload: serde_json::Value) -> Result<serde_json::Value, String> {
  let token = access(state).await?;
  let response = reqwest::Client::new().post(format!("{}{}", base_url(), path)).bearer_auth(token).json(&payload).send().await.map_err(|_| "VouchNet is temporarily unavailable. Check your connection and retry.".to_string())?;
  if response.status().as_u16() == 401 { *state.access_token.lock().map_err(|_| "Desktop session lock failed.")? = None; return Err("Your desktop session needs to be reconnected.".into()); }
  if !response.status().is_success() { return Err("VouchNet could not send that message.".into()); }
  response.json().await.map_err(|_| "VouchNet returned an invalid response.".into())
}

#[tauri::command]
fn desktop_begin_authentication(state: State<DesktopState>) -> Result<String, String> {
  let verifier = random_urlsafe(); let state_value = random_urlsafe();
  *state.pending.lock().map_err(|_| "Desktop session lock failed.")? = Some(PendingAuthorization { state: state_value.clone(), verifier: verifier.clone() });
  let mut url = Url::parse(&format!("{}/desktop/authorize", base_url())).map_err(|e| e.to_string())?;
  url.query_pairs_mut().append_pair("state", &state_value).append_pair("code_challenge", &challenge(&verifier)).append_pair("code_challenge_method", "S256");
  Ok(url.to_string())
}
#[tauri::command]
async fn desktop_complete_authentication(state: State<'_, DesktopState>, callback_url: String) -> Result<Option<Profile>, String> {
  let url = Url::parse(&callback_url).map_err(|_| "Invalid desktop callback.")?;
  if url.scheme() != "vouchnet" || url.host_str() != Some("auth") || url.path() != "/callback" { return Err("Rejected a non-VouchNet desktop callback.".into()); }
  let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
  let pending = state.pending.lock().map_err(|_| "Desktop session lock failed.")?.take().ok_or("No desktop sign-in was requested.")?;
  let code = params.get("code").ok_or("The desktop callback was missing a code.")?;
  if params.get("state") != Some(&pending.state) { return Err("Desktop sign-in state did not match.".into()); }
  let tokens = exchange("/api/desktop/token", serde_json::json!({"grantType":"authorization_code","code":code,"codeVerifier":pending.verifier})).await?;
  save_refresh(&tokens.refresh_token)?;
  *state.access_token.lock().map_err(|_| "Desktop session lock failed.")? = Some(tokens.access_token);
  profile(&state).await
}
#[tauri::command]
async fn desktop_restore_session(state: State<'_, DesktopState>) -> Result<Option<Profile>, String> { if load_refresh()?.is_none() { return Ok(None); } profile(&state).await }
#[tauri::command]
async fn desktop_feed(state: State<'_, DesktopState>) -> Result<serde_json::Value, String> { authenticated_get(&state, "/api/desktop/feed").await }
#[tauri::command]
async fn desktop_conversations(state: State<'_, DesktopState>) -> Result<serde_json::Value, String> { authenticated_get(&state, "/api/desktop/messages").await }
#[tauri::command]
async fn desktop_messages(state: State<'_, DesktopState>, conversation_id: String) -> Result<serde_json::Value, String> {
  if !is_uuid(&conversation_id) { return Err("Invalid conversation.".into()); }
  authenticated_get(&state, &format!("/api/desktop/messages/{conversation_id}")).await
}
#[tauri::command]
async fn desktop_send_message(state: State<'_, DesktopState>, conversation_id: String, body: String, attachments: Vec<DesktopAttachment>) -> Result<serde_json::Value, String> {
  if !is_uuid(&conversation_id) { return Err("Invalid conversation.".into()); }
  if body.trim().is_empty() && attachments.is_empty() { return Err("Write a message or add an attachment first.".into()); }
  if body.chars().count() > 12_000 || attachments.len() > 4 { return Err("That message is too large.".into()); }
  authenticated_post(&state, &format!("/api/desktop/messages/{conversation_id}/send"), serde_json::json!({"body":body,"attachments":attachments})).await
}
#[tauri::command]
fn desktop_sign_out(state: State<DesktopState>) -> Result<(), String> {
  *state.access_token.lock().map_err(|_| "Desktop session lock failed.")? = None;
  clear_refresh()
}

fn main() { tauri::Builder::default().plugin(tauri_plugin_deep_link::init()).plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_notification::init()).manage(DesktopState::default()).invoke_handler(tauri::generate_handler![desktop_begin_authentication, desktop_complete_authentication, desktop_restore_session, desktop_feed, desktop_conversations, desktop_messages, desktop_send_message, desktop_sign_out]).run(tauri::generate_context!()).expect("failed to run VouchNet Desktop"); }
