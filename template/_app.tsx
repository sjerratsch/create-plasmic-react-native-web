import React from "react";
import dynamic from "next/dynamic";

(global as any)["__DEV__"] = false;

import "../styles/globals.css";

import { PlasmicRootProvider } from "@plasmicapp/react-web";

function MyApp({ Component, pageProps }: any) {
    return (
        <PlasmicRootProvider>
            <Component {...pageProps} />
        </PlasmicRootProvider>
    );
}

// export default MyApp;
export default dynamic(() => Promise.resolve(MyApp), {
    ssr: false,
});
