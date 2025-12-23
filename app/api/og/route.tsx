import { ImageResponse } from "next/og";

export const runtime = "edge";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export async function GET() {
  try {
    // Fetch fonts from Google Fonts API
    const [playfairFont, interFont] = await Promise.all([
      fetch(
        "https://fonts.gstatic.com/s/playfairdisplay/v40/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKd3vUDQ.ttf"
      ).then((res) => res.arrayBuffer()),
      fetch(
        "https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      ).then((res) => res.arrayBuffer()),
    ]);

    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FAF8F5",
            padding: "60px",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "40px",
            }}
          >
            <div
              style={{
                width: "100px",
                height: "100px",
                borderRadius: "20px",
                backgroundColor: "#1A1A1A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Layers icon */}
              <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            <span
              style={{
                marginLeft: "28px",
                fontSize: "56px",
                fontFamily: "Inter",
                fontWeight: 500,
                color: "#1A1A1A",
                letterSpacing: "-0.02em",
              }}
            >
              OpenDesign
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "78px",
                fontFamily: "Playfair Display",
                fontWeight: 500,
                color: "#1A1A1A",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginBottom: "20px",
              }}
            >
              <span>Design anything</span>
              <span
                style={{
                  color: "#B8956F",
                  fontStyle: "italic",
                  marginLeft: "18px",
                }}
              >
                in minutes
              </span>
            </div>
            <span
              style={{
                fontSize: "32px",
                fontFamily: "Inter",
                color: "#6B6B6B",
              }}
            >
              AI-powered app mockups through conversation
            </span>
          </div>

          {/* Bottom tagline */}
          <div
            style={{
              position: "absolute",
              bottom: "48px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#B8956F",
              }}
            />
            <span
              style={{
                fontSize: "20px",
                fontFamily: "Inter",
                color: "#9A9A9A",
              }}
            >
              Open Source · AI-Powered Design
            </span>
          </div>
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        fonts: [
          {
            name: "Playfair Display",
            data: playfairFont,
            style: "normal",
            weight: 400,
          },
          {
            name: "Inter",
            data: interFont,
            style: "normal",
            weight: 500,
          },
        ],
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      }
    );
  } catch (error) {
    console.error("OG Image generation error:", error);
    // Fallback simple image
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FAF8F5",
            fontSize: "48px",
            color: "#1A1A1A",
          }}
        >
          OpenDesign - AI App Designer
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
      }
    );
  }
}
