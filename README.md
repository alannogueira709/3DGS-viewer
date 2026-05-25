# Gaussian Splattings 3D Web Viewer 

This repository contains a web viewer for 3D Gaussian Splattings, it supports previously downloaded Splats hosted in your local machine as well as 4 splats with urls available in public datasets on Hugging Face by cakewalk. 

The walkthrough to run it on your local machine is:

```
#Clone repository
git clone https://github.com/alannogueira709/3DGS-viewer.git

#Navigate into the project directory
cd 3DGS-viewer

# Install core dependencies (you can use your preferred package manager)
pnpm install

# Run the development server
pnpm run dev --host
```
## Demo of the usage:
In this GIF, I used a splat downloaded from superspl.at. Initially, the file had to be converted to the .splat format, but the viewer now natively supports .ply files as well.

<img width="1080" height="608" alt="moon" src="https://github.com/user-attachments/assets/557d6f68-ec2f-4c35-85fc-34e549da38ff" />
