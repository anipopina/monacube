// provide/inject 用のキーを定義するファイル
// Symbolをキーとして使うことでprovide側/inject側で型の同期がとれる

export const managedCreatePasskeyKey: InjectionKey<() => Promise<void>> = Symbol('managedCreatePasskey')
export const managedLoginKey: InjectionKey<() => Promise<void>> = Symbol('managedLogin')
export const managedLogoutKey: InjectionKey<() => void> = Symbol('managedLogout')
export const managedLockWalletKey: InjectionKey<() => void> = Symbol('managedLockWallet')
