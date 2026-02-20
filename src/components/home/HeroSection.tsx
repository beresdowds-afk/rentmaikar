import { Link } from "react-router-dom";
import { MessageCircle, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "124078589931";
const SMS_NUMBER = "124078589931";

const HeroSection = () => {
  return (
    <section className="relative w-full" style={{ paddingTop: "64px" }}>
      {/* Canva Embed */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 0,
          paddingTop: "96.817%",
          paddingBottom: 0,
          boxShadow: "0 2px 8px 0 rgba(63,69,81,0.16)",
          overflow: "hidden",
          borderRadius: 0,
          willChange: "transform",
        }}
      >
        <iframe
          loading="lazy"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            top: 0,
            left: 0,
            border: "none",
            padding: 0,
            margin: 0,
          }}
          src="https://www.canva.com/design/DAHB0MhNQG8/tgr0P0y88bZBexcV50g1GA/watch?embed"
          allowFullScreen
          allow="fullscreen"
          title="Rentmaikar Hero"
        />
      </div>

      {/* CTA Overlay — sits below the embed on mobile, overlaps on larger screens */}
      <div className="bg-background py-8 px-4">
        <div className="container mx-auto flex flex-col items-center gap-6">

          {/* Contact Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="whatsapp" size="lg" className="gap-2">
                <MessageCircle className="w-5 h-5" />
                WhatsApp Us
              </Button>
            </a>
            <a href={`sms:${SMS_NUMBER}`}>
              <Button variant="sms" size="lg" className="gap-2">
                <Phone className="w-5 h-5" />
                Text Us
              </Button>
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/driver/register">
              <Button variant="heroCTAGreen" size="xl" className="gap-3 py-5">
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-black text-3xl uppercase tracking-wide">Drivers</span>
                  <span className="text-sm font-normal opacity-80">register — <em>here</em></span>
                </span>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </Button>
            </Link>
            <Link to="/owner/register">
              <Button variant="heroCTAGreen" size="xl" className="gap-3 py-5">
                <span className="flex flex-col items-start leading-tight">
                  <span className="font-black text-3xl uppercase tracking-wide">Owners</span>
                  <span className="text-sm font-normal opacity-80">list your car — <em>here</em></span>
                </span>
                <ArrowRight className="w-5 h-5 flex-shrink-0" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
