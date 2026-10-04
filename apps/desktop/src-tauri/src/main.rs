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
#[derive(Deserialize, Serialize)] #[serde(rename_all = "camelCase")] struct Profile { full_name: String, headline: Option<String>, slug: String }
#[derive(Deserialize)] struct ProfileResponse { profile: Option<Profile> }

fn base_url() -> String { std::env::var("VOUCHNET_URL").unwrap_or_else(|_| "https://vouchnet.dev".into()).trim_end_matches('/').into() }
fn random_urlsafe() -> String { let mut bytes = [0_u8; 32]; rand::thread_rng().fill_bytes(&mut bytes); URL_SAFE_NO_PAD.encode(bytes) }
fn challenge(verifier: &str) -> String { URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes())) }
fn credential() -> Result<keyring::Entry, String> { keyring::Entry::new(SERVICE, ACCOUNT).map_err(|e| e.to_string()) }
fn save_refresh(value: &str) -> Result<(), String> { credential()?.set_password(value).map_err(|e| e.to_string()) }
fn load_refresh() -> Result<Option<String>, String> { match credential()?.get_password() { Ok(value) => Ok(Some(value)), Err(keyring::Error::NoEntry) => Ok(None), Err(error) => Err(error.to_string()) } }

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
  response.json::<ProfileResponse>().await.map_err(|e| e.to_string()).map(|response| response.profile)
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
async fn desktop_feed(state: State<'_, DesktopState>) -> Result<serde_json::Value, String> { let token = access(&state).await?; let response = reqwest::Client::new().get(format!("{}/api/desktop/feed", base_url())).bearer_auth(token).send().await.map_err(|e| e.to_string())?; if !response.status().is_success() { return Err("The VouchNet feed is unavailable.".into()); } response.json().await.map_err(|e| e.to_string()) }

fn main() { tauri::Builder::default().plugin(tauri_plugin_deep_link::init()).plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_notification::init()).manage(DesktopState::default()).invoke_handler(tauri::generate_handler![desktop_begin_authentication, desktop_complete_authentication, desktop_restore_session, desktop_feed]).run(tauri::generate_context!()).expect("failed to run VouchNet Desktop"); }
