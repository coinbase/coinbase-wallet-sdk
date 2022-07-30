// swift-tools-version: 5.4

import PackageDescription

let package = Package(
    name: "CoinbaseWalletSDK",
    platforms: [.iOS(.v12)],
    products: [
        .library(
            name: "CoinbaseWalletSDK",
            targets: ["CoinbaseWalletSDK"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "CoinbaseWalletSDK",
            dependencies: [],
            path: "packages/wallet-native-sdk/ios"
        ),
    ]
)
