export function unpackSurface(points,surface){
    const count=points.length/9;
    surface.length=Math.min(surface.length,count);
    for(let i=0;i<count;i++){
        const row=surface[i]??(surface[i]=[{},{},{}]);
        for(let j=0;j<3;j++){
            const offset=i*9+j*3;
            row[j].x=points[offset];row[j].y=points[offset+1];row[j].z=points[offset+2];
        }
    }
    return surface;
}
