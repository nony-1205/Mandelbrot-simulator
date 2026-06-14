# Mandelbrot Set Explorer

An interactive Mandelbrot and Julia set explorer built from scratch with WebGL and vanilla JavaScript, no libraries or frameworks.

## Features

- Real-time rendering via WebGL fragment shaders
- Julia set preview that updates live as you hover
- Smooth coloring and animated color palette
- Zoom to cursor with emulated double-single precision for deep zoom (perturbation theory was not used)
- Coordinates and zoom level displayed in real time

## Controls

 Pan:  Click and drag 
 Zoom:  Pinch or Ctrl + scroll 
 Julia set: Hover over Mandelbrot 
 Animate colors : Click Animate button 
 Stop animation : Click anywhere on Mandelbrot 

## Running Locally

open `index.html` in a browser or:

```bash
npx live-server
```

## Built With

WebGL 1.0 · GLSL ES 1.0 · Vanilla JavaScript · HTML/CSS
