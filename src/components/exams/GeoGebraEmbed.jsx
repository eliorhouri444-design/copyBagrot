import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from "lucide-react";

const GeoGebraEmbed = ({ commands, width = "100%", height = 500 }) => {
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scriptLoaded, setScriptLoaded] = useState(false);

    useEffect(() => {
        // Load GeoGebra script if not already loaded
        if (window.GGBApplet) {
            setScriptLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = "https://cdn.geogebra.org/apps/deployggb.js";
        script.async = true;
        script.onload = () => setScriptLoaded(true);
        document.body.appendChild(script);

        return () => {
            // Cleanup if needed
        };
    }, []);

    useEffect(() => {
        if (!scriptLoaded || !containerRef.current) return;

        const ggbId = 'ggb-element-' + Math.random().toString(36).substr(2, 9);
        containerRef.current.id = ggbId;

        const params = {
            appName: "geometry", // or "classic", "graphing"
            width: containerRef.current.offsetWidth || 800,
            height: height,
            showToolBar: true,
            showAlgebraInput: true,
            showMenuBar: false,
            showResetIcon: true,
            enableLabelDrags: true,
            enableShiftDragZoom: true,
            enableRightClick: true,
            showLogging: false,
            useBrowserForJS: false,
            // Callback when applet is ready
            appletOnLoad: (api) => {
                setIsLoading(false);
                // Store api on window/context if needed, or just use it here
                if (commands && commands.length > 0) {
                    // Slight delay to ensure full init
                    setTimeout(() => {
                        commands.forEach(cmd => {
                            try {
                                api.evalCommand(cmd);
                            } catch (e) {
                                console.error("Error executing GGB command:", cmd, e);
                            }
                        });
                        // Adjust view to show all objects
                        api.evalCommand("CenterView((0,0))"); 
                        // Or utilize "ZoomIn" / "ZoomOut" logic if needed, 
                        // but usually manual interaction is best for geometry.
                    }, 500);
                }
            }
        };

        const applet = new window.GGBApplet(params, true);
        applet.inject(ggbId);

    }, [scriptLoaded, commands, height]);

    return (
        <div className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="mr-2 text-sm text-slate-500">טוען GeoGebra...</span>
                </div>
            )}
            <div 
                ref={containerRef} 
                style={{ width: '100%', height: `${height}px` }} 
                className="bg-white"
            />
        </div>
    );
};

export default GeoGebraEmbed;