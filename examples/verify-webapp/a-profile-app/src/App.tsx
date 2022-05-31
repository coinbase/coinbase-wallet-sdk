import { ethers } from "ethers";
import { useEffect, useState } from "react";
import "./App.css";

type OpenSeaAsset = {
  id: number;
  image_url?: string;
  image_preview_url?: string;
  image_thumbnail_url?: string;
  image_original_url?: string;
  name: string;
  description: string;
  collection: {
    name: string;
    image_url: string;
  };
};

type Resp = {
  assets: OpenSeaAsset[];
};

const VERIFY_URL = "http://localhost:3000/?token=test_app_token";

function App() {
  const search = new URLSearchParams(window.location.search);
  const address = search.get("address");
  const sign = search.get("sign");
  const message = search.get("message");

  const [images, setImages] = useState<OpenSeaAsset[]>([]);
  const [profileImg, setProfileImg] = useState("");

  async function fetchAssets(add: string | null): Promise<Resp> {
    const resp = await fetch(
      `https://testnets-api.opensea.io/api/v1/assets?owner=${add}&order_direction=desc&offset=0&limit=20`,
    );
    return await resp.json();
  }

  async function fetchImages(add: string) {
    try {
      const imageResp = await fetchAssets(add);
      console.log(imageResp);
      const validImgUrls = imageResp.assets.filter(img =>
        Boolean(img.image_preview_url || img.collection.image_url),
      );

      setImages(validImgUrls);
    } catch (err) {
      console.error(err);
    }
  }

  console.log(address);

  useEffect(() => {
    if (address && message && sign) {
      // Verify message by passing in values for message and signature
      const recoveredAddress = ethers.utils.verifyMessage(message, sign);

      // If recovered message is equal to the address value, fetch images
      if (recoveredAddress === address) {
        fetchImages(address);
      } else {
        // Error state
        console.error("Error verifying user");
      }
    }
  }, [address]);

  const handleOnClick = async () => {
    console.log("clicked");
    window.location.href = VERIFY_URL;
  };

  const handleOnSelect = (img: string) => {
    console.log("selected");
    setProfileImg(img);
  };

  return (
    <div className="card-container flex flex-row mx-auto">
      <div className="w-1/2 pt-12 my-10 h-screen overflow-hidden">
        <div className="bg-zinc-50 text-center rounded-lg px-4 pb-14 pt-24 w-full shadow-xl mt-16 relative">
          <div className="card-profile">
            <div className="card-profile-pic rounded-full bg-gradient-to-r from-purple-500 to-pink-500 overflow-hidden flex justify-center items-center">
              {profileImg ? <img src={profileImg} /> : <></>}
            </div>
          </div>
          <h1 className="font-bold text-xs text-gray-500 uppercase mb-8 text-center leading-tight">
            Welcome to your profile!
          </h1>
          {!address ? (
            <button
              onClick={handleOnClick}
              className="px-6 py-2 border-2 border-blue-600 text-blue-600 font-medium text-xs leading-tight uppercase rounded-full hover:bg-black hover:bg-opacity-5 focus:outline-none focus:ring-0 transition duration-150 ease-in-out"
            >
              Verify with your wallet
            </button>
          ) : (
            <></>
          )}
          {!profileImg && images?.length > 0 ? (
            <div className="font-medium text-center">
              Select your profile picture ...
            </div>
          ) : (
            <></>
          )}
          {address && !images?.length && (
            <div className="text-center">
              <p className="font-medium">You have no images to select from.</p>
              Check out{" "}
              <a
                href="https://opensea.io/"
                rel="noreferrer"
                target="_blank"
                className="underline decoration-pink-500/30"
              >
                OpenSea.io
              </a>{" "}
              to purchase and select an NFT as your profile picture.
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-wrap justify-center w-1/2 my-10 h-screen overflow-y-scroll pb-16">
        {images?.map(img => {
          const image = img.image_preview_url || img.collection.image_url;
          const isSelectedImage = profileImg === image;

          return (
            <div
              key={img.id}
              className="card flex relative rounded-lg overflow-hidden m-3 w-64 h-64 shadow-xl"
            >
              <img
                alt={`nft image ${img.name}`}
                className="absolute inset-0 w-full h-full object-cover object-center rounded-lg"
                src={image}
              />
              <div
                className={`
                ${
                  isSelectedImage
                    ? "opacity-100"
                    : "opacity-0 hover:opacity-100"
                }
                px-8 py-10 relative z-10 w-full bg-white transition duration-200 ease-in-out`}
              >
                <h2 className="tracking-widest text-xs title-font font-medium text-indigo-500 mb-1">
                  {img.collection.name}
                </h2>
                <h1 className="title-font text-sm font-medium text-gray-500 mb-6">
                  {img.name}
                </h1>
                <button
                  onClick={() => handleOnSelect(image)}
                  disabled={isSelectedImage}
                  className={`
                ${
                  isSelectedImage
                    ? "opacity-50"
                    : "cursor-pointer  hover:bg-blue-500 active:bg-blue-700"
                }
                inline-flex text-white justify-center items-center align-middle px-4 py-2 border border-transparent text-sm leading-5 font-semibold rounded-md bg-blue-600`}
                >
                  {isSelectedImage ? "Selected" : "Set as profile pic"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
