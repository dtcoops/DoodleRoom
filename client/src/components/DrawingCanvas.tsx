import { useEffect, useRef, useCallback } from 'react';
import type { DrawSegment } from '../types/types';
import styles from './DrawingCanvas.module.css';

interface DrawingCanvasProps {
    enabled: boolean;
    onDraw: (segment: DrawSegment) => void;
    incomingSegments: DrawSegment[];
    clearSignal: number;
}

export function DrawingCanvas({ enabled, onDraw, incomingSegments, clearSignal }: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const drawnCountRef = useRef(0);
    const segmentsRef = useRef<DrawSegment[]>(incomingSegments); // always holds latest segments

    useEffect(() => {
        segmentsRef.current = incomingSegments;
    }, [incomingSegments]);

    function getContext() {
        return canvasRef.current?.getContext('2d') ?? null;
    }

    const paintSegment = useCallback((seg: DrawSegment) => {
        const canvas = canvasRef.current;
        const ctx = getContext();
        if (!ctx || !canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;

        ctx.strokeStyle = seg.color;
        ctx.lineWidth = seg.width * width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(seg.x0 * width, seg.y0 * height);
        ctx.lineTo(seg.x1 * width, seg.y1 * height);
        ctx.stroke();
    }, []);

    // Set up ONCE — the observer's callback reads segmentsRef.current fresh every time it fires
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        function resize() {
            const dpr = window.devicePixelRatio || 1;
            const parent = canvas!.parentElement!;
            const style = getComputedStyle(parent);
            const paddingX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
            const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
            const rect = parent.getBoundingClientRect();
            const width = rect.width - paddingX;
            const height = rect.height - paddingY;

            console.log({ rectWidth: rect.width, rectHeight: rect.height, paddingX, paddingY, computedWidth: width, computedHeight: height });
            
            canvas!.width = width * dpr;
            canvas!.height = height * dpr;
            canvas!.style.width = `${width}px`;
            canvas!.style.height = `${height}px`;
            const ctx = canvas!.getContext('2d');
            ctx?.scale(dpr, dpr);

            segmentsRef.current.forEach(paintSegment);
        }

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas.parentElement!);
        return () => observer.disconnect();
    }, [paintSegment]); // only re-created if paintSegment itself changes (it won't, given empty deps)

    useEffect(() => {
        const newOnes = incomingSegments.slice(drawnCountRef.current);
        newOnes.forEach(paintSegment);
        drawnCountRef.current = incomingSegments.length;
    }, [incomingSegments, paintSegment]);

    useEffect(() => {
        const ctx = getContext();
        if (!ctx || !canvasRef.current) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        drawnCountRef.current = 0;
    }, [clearSignal]);

    // Returns NORMALIZED (0-1) coordinates, relative to the canvas's current displayed size
    function getRelativePoint(e: React.MouseEvent<HTMLCanvasElement>) {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / rect.width,
            y: (e.clientY - rect.top) / rect.height,
        };
    }

    function handlePointerDown(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!enabled) return;
        isDrawingRef.current = true;
        lastPointRef.current = getRelativePoint(e);
    }

    function handlePointerMove(e: React.MouseEvent<HTMLCanvasElement>) {
        if (!enabled || !isDrawingRef.current || !lastPointRef.current) return;
        const canvas = canvasRef.current!;
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = canvas.width / dpr;

        const point = getRelativePoint(e);
        const segment: DrawSegment = {
            x0: lastPointRef.current.x,
            y0: lastPointRef.current.y,
            x1: point.x,
            y1: point.y,
            color: '#1a1a1a',
            width: 3 / logicalWidth, // normalize stroke width the same way as position
        };
        paintSegment(segment);
        onDraw(segment);
        lastPointRef.current = point;
    }

    function handlePointerUp() {
        isDrawingRef.current = false;
        lastPointRef.current = null;
    }

    return (
        <canvas
            ref={canvasRef}
            className={styles.drawingCanvas}
            style={{ cursor: enabled ? 'crosshair' : 'default' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
        />
    );
}