Pod::Spec.new do |s|
  s.name             = 'CoinbaseWalletSDK'
  s.version          = '0.1.0'
  s.summary          = 'Swift SDK to interact with Coinbase Wallet iOS app'
  s.description      = <<-DESC
Swift implementation of WalletSegue protocol for iOS web3 apps to interact with web3 wallets.
Inter-app messaging contained within user's device, not requiring a bridge server.
Secure communication channel between client app and host wallet.
Decentralized verification of participating apps' authenticity without centralized registry.
                       DESC
  s.homepage         = 'https://www.coinbase.com/wallet/developers'
  s.license          = { :type => 'Apache', :file => 'LICENSE' }
  s.author           = { 'Coinbase Wallet' => 'wallet-build-squad@coinbase.com' }
  s.source           = { :git => 'https://github.com/coinbase/coinbase-wallet-sdk.git', :tag => "ios-v#{s.version}" }
  s.social_media_url = 'https://twitter.com/CoinbaseWallet'
  s.ios.deployment_target = '12.0'
  s.swift_version = '5.0'
  s.source_files = 'packages/wallet-native-sdk/ios/**/*.swift'
end
