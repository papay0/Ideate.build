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
                fontSize: "128px",
                fontFamily: "Playfair Display",
                fontWeight: 500,
                color: "#1A1A1A",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginBottom: "32px",
              }}
            >
              <span>Ideate.</span>
              <span
                style={{
                  color: "#B8956F",
                  fontStyle: "italic",
                  marginLeft: "24px",
                }}
              >
                Build.
              </span>
            </div>
            <span
              style={{
                fontSize: "48px",
                fontFamily: "Inter",
                color: "#6B6B6B",
              }}
            >
              Turn ideas into interactive prototypes
            </span>
          </div>

          {/* Logo watermark at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: "48px",
              left: "60px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#B8956F"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
            <span
              style={{
                fontSize: "36px",
                fontFamily: "Inter",
                fontWeight: 500,
                color: "#9A9A9A",
                letterSpacing: "-0.02em",
              }}
            >
              Ideate
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
          Ideate - AI App Designer
        </div>
      ),
      {
        width: OG_WIDTH,
        height: OG_HEIGHT,
      }
    );
  }
}
