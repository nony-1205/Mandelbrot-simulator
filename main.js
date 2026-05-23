
const fragmentShader=`
precision highp float;
uniform vec2 u_res;
uniform float u_zoom;
uniform vec2 u_offset;


void main(){
    vec2 z= vec2(0.0,0.0); 
    vec2 c= (gl_FragCoord.xy- u_res *0.5)/ (u_zoom *u_res.y *0.5) + u_offset;
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
        
        float t= float(escapeIter)/ float(maxIter);
        float r = 0.5 + 0.5*cos(6.28318 *(1.0 * t + 0.00));
        float g = 0.5 + 0.5*cos(6.28318 * (1.0 * t +0.33));
        float b = 0.5 + 0.5*cos(6.28318 * (1.0 * t +0.67));

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

let zoom= 0.35;
let offsetX= -0.5;
let offsetY= 0.0;
let isDragging= false;
let startX= 0;
let startY= 0;


const canvas= document.getElementById('c')
const gl = canvas.getContext('webgl')

canvas.width=window.innerWidth
canvas.height= window.innerHeight

gl.viewport(0,0,canvas.width,canvas.height)

const fragShader = gl.createShader(gl.FRAGMENT_SHADER)
gl.shaderSource(fragShader,fragmentShader)
gl.compileShader(fragShader)


const vertShader = gl.createShader(gl.VERTEX_SHADER)
gl.shaderSource(vertShader,vertexShader)
gl.compileShader(vertShader)


const program = gl.createProgram()
gl.attachShader(program,vertShader)
gl.attachShader(program,fragShader)
gl.linkProgram(program)
gl.useProgram(program)


const buffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1,-1,  1,-1,  -1,1,
    -1,1,   1,-1,   1,1,
]), gl.STATIC_DRAW)


const loc= gl.getAttribLocation(program,'a_pos')
gl.enableVertexAttribArray(loc)
gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)


const uRes= gl.getUniformLocation(program,'u_res')
const uZoom= gl.getUniformLocation(program,'u_zoom')
const uOffset= gl.getUniformLocation(program,'u_offset')

gl.drawArrays(gl.TRIANGLES, 0, 6)



function render(){
    gl.uniform2f(uRes, canvas.width, canvas.height)
    gl.uniform1f(uZoom,zoom)
    gl.uniform2f(uOffset,offsetX,offsetY)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
}


//for move using mouse
canvas.addEventListener('mousedown', (event) =>{
    isDragging=true
    startX= event.clientX
    startY=event.clientY})


canvas.addEventListener('mousemove', (event) =>{
    if (!isDragging) return; 
    const deltaX= event.clientX- startX
    const deltaY= event.clientY- startY

    offsetX -= deltaX/ (zoom*canvas.height*0.5)
    offsetY += deltaY/ (zoom*canvas.height*0.5)

    startX= event.clientX
    startY=event.clientY

    render()})


window.addEventListener('mouseup',()=>{
    isDragging=false})


//for zooming using touchpad
canvas.addEventListener('wheel', (event)=>{
    event.preventDefault() //prevents the whole browser pg from scrolling

    if (event.ctrlKey){
        let zoomfactor= 1.05;
        if (event.deltaY<0){
            zoom *= zoomfactor //zoom in when pinching out
        }else{
            zoom*=(1/zoomfactor) //zoom out when pinching in
        }
    }else{
        offsetX+= (event.deltaX*0.005)*zoom
        offsetY-= (event.deltaY*0.005)*zoom //ts for touchpad two finger moving or swiping not zoom
    }

    render() }, {passive: false}) // passive: false is needed to make preventDefault() work



//for touch using fingers
canvas.addEventListener('touchstart',(event)=>{
    isDragging=true
    startX= event.touches[0].clientX
    startY=event.touches[0].clientY})


canvas.addEventListener('touchmove',(event)=>{
    if (!isDragging) return;

    const deltaX= event.clientX- startX
    const deltaY= event.clientY- startY

    offsetX -= deltaX/ (zoom* canvas.height*0.5)
    offsetY += deltaY/ (zoom * canvas.height *0.5)

    startX= event.touches[0].clientX
    startY=event.touches[0].clientY

    render()})


canvas.addEventListener('touchend',()=>{
    isDragging=false})



render()