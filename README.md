# Infomaniak-Newsletter-Interface
Simpler Interface for the Newsletter Tool of Infomaniak

[Built with Tauri](https://tauri.app/)

## API keys safety
In the current state of the programm, the API keys are only poorly secured. All settings are “encrypted” via XOR and stored in this form. The key for the encryption always remains the same. If anyone would like to improve this, pull request are welcome.