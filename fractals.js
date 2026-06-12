
function createFractal(canvasId, fragmentShaderSource) {
    const canvas= document.getElementById(canvasId)
    const gl= canvas.getContext('webgl')

    canvas.width= canvas.parentElement.offsetWidth
    canvas.height= canvas.parentElement.offsetHeight

    gl.viewport(0,0, canvas.width, canvas.height)

    const fragShader= gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragShader, fragmentShaderSource)
    gl.compileShader(fragShader)

    const vertShader= gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertShader, vertexShader)
    gl.compileShader(vertShader)

    const program= gl.createProgram()
    gl.attachShader(program, fragShader)
    gl.attachShader(program, vertShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    const buffer= gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1,-1,  1,-1,  -1,1,
        -1,1,   1,-1,   1,1,
    ]), gl.STATIC_DRAW)

    const loc= gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes= gl.getUniformLocation(program, 'u_res')
    const uZoom= gl.getUniformLocation(program, 'u_zoom')
    const uOffsetHi= gl.getUniformLocation(program, 'u_offset_hi')
    const uOffsetLo= gl.getUniformLocation(program, 'u_offset_lo') //emulated doulbe precision using two floats (hi and lo)

    const uJulia= gl.getUniformLocation(program, 'u_julia')

    function render(zoom, offsetX, offsetY){

        const offsetXHi= Math.fround(offsetX)
        const offsetXLo= offsetX - offsetXHi

        const offsetYHi= Math.fround(offsetY)
        const offsetYLo= offsetY - offsetYHi

        gl.uniform2f(uRes, canvas.width, canvas.height)
        gl.uniform1f(uZoom, zoom)
        gl.uniform2f(uOffsetHi, offsetXHi, offsetYHi)
        gl.uniform2f(uOffsetLo, offsetXLo, offsetYLo)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    return {gl, canvas, program, uRes, uZoom, uOffsetHi, uOffsetLo, uJulia, render}
}


const mandelbrotShader =`
precision highp float;
uniform vec2 u_res;
uniform float u_zoom;
uniform vec2 u_offset_hi;
uniform vec2 u_offset_lo;

vec2 ds_add(vec2 a, vec2 b) {
    float s = a.x + b.x;        // normal float add (rounded)
    float v = s - a.x;          // how much b.x contributed
    float e = (a.x - (s - v))   // rounding error from a.x
            + (b.x - v)         // rounding error from b.x
            + a.y + b.y;        // add the existing lo parts
    return vec2(s + e, e - ((s + e) - s));
}


vec2 ds_mul(vec2 a, vec2 b) {
    float c11 = a.x * b.x;
    float c21 = a.x * b.y + a.y * b.x;
    float t1 = c11 + c21;
    float t2 = c21 - (t1 - c11);
    return vec2(t1, t2 + a.y * b.y);
}


vec2 ds_set(float a){
    return vec2(a,0.0);}


void main(){

    vec2 z_single = vec2(0.0);

    vec2 pixel_delta= (gl_FragCoord.xy- u_res *0.5)/ (u_zoom *u_res.y *0.5);

    vec2 cx = ds_add(vec2(u_offset_hi.x, u_offset_lo.x), ds_set(pixel_delta.x));
    vec2 cy = ds_add(vec2(u_offset_hi.y, u_offset_lo.y), ds_set(pixel_delta.y));

    //cx and cy are now seperate cuz one is for the real axis and one is for the y axis, each has a hi lo pair
    
    vec2 zx= vec2(0.0,0.0);
    vec2 zy= vec2(0.0,0.0);

    const int maxIter= 200;
    int escapeIter= maxIter;

    for (int i=0; i<maxIter; i++){
        vec2 zx2= ds_mul(zx,zx); 
        vec2 zy2= ds_mul(zy,zy);

        if (zx2.x +zy2.x >4.0){ //only .x and not .x+.y cuz the lo parts (zx2.y,zy2.y) are tiny and when adding them makes litreally no difference
            escapeIter= i; 
            z_single = vec2(zx.x, zy.x); //store the single precision value of z at escape time for smooth coloring
            break;
        }
        
        vec2 zx_new = ds_add(ds_add(zx2, vec2(-zy2.x, -zy2.y)), cx); //zx^2 - zy^2 + cx

        vec2 zx_zy= ds_mul(zx,zy);
        vec2 zy_new = ds_add(ds_add(zx_zy, zx_zy), cy); //2*zx*zy + cy

        zx= zx_new;
        zy= zy_new;
    }
        
        float t= (escapeIter< maxIter)
            ? (float(escapeIter) - log2(log2(max(dot(z_single,z_single), 0.1))) +4.0) / float(maxIter)
            : 0.0;
        float r = 0.5 + 0.5*cos(6.28318 *(3.0 * t + 0.30));
        float g = 0.5 + 0.5*cos(6.28318 * (3.0 * t +0.23));
        float b = 0.5 + 0.5*cos(6.28318 * (3.0 * t +0.87));

        if (escapeIter==maxIter){
            gl_FragColor= vec4(0.0, 0.0, 0.0, 1.0); //pure black
        } else{
            gl_FragColor= vec4(r,g,b,1.0);   
        }
}
`

const vertexShader = `
    attribute vec2 a_pos;
    void main(){
        gl_Position = vec4(a_pos, 0.0, 1.0);}
`


const juliaShader =`
precision highp float;
uniform vec2 u_res;
uniform float u_zoom;
uniform vec2 u_offset;
uniform vec2 u_julia; //the constant c in the formula z= z^2 +c

void main(){
    vec2 c= u_julia;
    vec2 z= (gl_FragCoord.xy- u_res *0.5)/ (u_zoom *u_res.y *0.5);
    vec2 zNew;
    const int maxIter= 200;
    int escapeIter= maxIter;

    for (int i=0; i<maxIter; i++){
        zNew.x= z.x*z.x - z.y*z.y +c.x; //the real part
        zNew.y = 2.0*z.x*z.y +c.y; //the imaginary part
        z=zNew; //overwrites the old coordinates w new ones 
        if (z.x*z.x +z.y*z.y > 4.0) {
            escapeIter= i;
            break;
            }
        }
        
        float t= (escapeIter< maxIter)
            ? (float(escapeIter) - log2(log2(dot(z,z))) +4.0) / float(maxIter)
            : 0.0;
        float r = 0.5 + 0.5*cos(6.28318 *(3.0 * t + 0.30));
        float g = 0.5 + 0.5*cos(6.28318 * (3.0 * t +0.23));
        float b = 0.5 + 0.5*cos(6.28318 * (3.0 * t +0.87));

        if (escapeIter==maxIter){
            gl_FragColor= vec4(0.0, 0.0, 0.0, 1.0); //pure black
        } else{
            gl_FragColor= vec4(r,g,b,1.0);   
        }
}
`


let zoom= 0.35;
let offsetX= -0.5;
let offsetY= 0.0;
let isDragging= false;
let startX= 0;
let startY= 0;


window.addEventListener('load',() =>{

    const mandelbrot = createFractal('mandelbrot', mandelbrotShader)
    const julia= createFractal('julia', juliaShader)
    mandelbrot.render(zoom, offsetX, offsetY)


    mandelbrot.canvas.addEventListener('mousedown', (e)=>{
        isDragging= true;
        startX= e.clientX;
        startY= e.clientY;})


    mandelbrot.canvas.addEventListener('mousemove', (e) =>{

        if (!isDragging){

            const re= (e.clientX - mandelbrot.canvas.offsetLeft - mandelbrot.canvas.width/2) / (zoom * mandelbrot.canvas.height*0.5) +offsetX
            const im= (e.clientY - mandelbrot.canvas.offsetTop -mandelbrot.canvas.height/2) / (zoom * mandelbrot.canvas.height*0.5) - offsetY

            document.getElementById('info-re').textContent= re.toFixed(5)
            document.getElementById('info-im').textContent= im.toFixed(5)
            document.getElementById('info-zoom').textContent= zoom.toFixed(0)

            // console.log('re:', re, 'im:', im)

            julia.gl.useProgram(julia.program)
            julia.gl.uniform2f(julia.uJulia, re, im)
            julia.render(1.0, 0.0, 0.0)
        
        }

        if (!isDragging) return;

        const deltaX = e.clientX- startX
        const deltaY= e.clientY- startY

        offsetX -= deltaX/ (zoom* mandelbrot.canvas.height*0.5)
        offsetY += deltaY/ (zoom*mandelbrot.canvas.height*0.5)

        startX= e.clientX
        startY= e.clientY

        mandelbrot.render(zoom, offsetX, offsetY)})



    document.addEventListener('mouseup',()=>{
            isDragging=false})

    

    //for zooming using touchpad
    mandelbrot.canvas.addEventListener('wheel', (e)=>{

        e.preventDefault() //prevents the whole browser pg from scrolling

        if (!e.ctrlKey) return  // ignore pan gestures, only handle pinch zoom

        const delta= Math.sign(e.deltaY) //gives direction of the scroll (up or down)
        const factor= delta > 0 ? 1/1.05 : 1.05 //if scrolling down, zoom out (divide by 1.05), if scrolling up, zoom in (multiply by 1.05)

        const mouseRe = (e.clientX - mandelbrot.canvas.offsetLeft - mandelbrot.canvas.width/2) / (zoom * mandelbrot.canvas.height * 0.5) + offsetX
        const mouseIm = (e.clientY - mandelbrot.canvas.offsetTop - mandelbrot.canvas.height/2) / (zoom * mandelbrot.canvas.height * 0.5) - offsetY

        zoom *= factor
        zoom = Math.max(zoom,0.3)
        zoom= Math.min(zoom, 390000)

        document.getElementById('info-zoom').textContent= zoom.toFixed(0)


        offsetX= mouseRe- (e.clientX - mandelbrot.canvas.offsetLeft - mandelbrot.canvas.width/2) / (zoom*mandelbrot.canvas.height*0.5)
        offsetY= -mouseIm+ (e.clientY - mandelbrot.canvas.offsetTop - mandelbrot.canvas.height/2) / (zoom*mandelbrot.canvas.height*0.5)

        console.log('zoom:', zoom)

        mandelbrot.render(zoom, offsetX, offsetY) 
    }, {passive: false}) // passive: false is needed to make preventDefault() work

    

    mandelbrot.canvas.addEventListener('touchmove',(e)=>{
        if (!isDragging) return;

        const deltaX= e.clientX- startX
        const deltaY= e.clientY- startY

        offsetX -= deltaX/ (zoom* mandelbrot.canvas.height*0.5)
        offsetY += deltaY/ (zoom * mandelbrot.canvas.height *0.5)

        startX= e.touches[0].clientX
        startY= e.touches[0].clientY

        mandelbrot.render(zoom, offsetX, offsetY)})



    mandelbrot.canvas.addEventListener('touchend',()=>{
        isDragging=false})
    
})

