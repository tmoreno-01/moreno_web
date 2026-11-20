Out of Place — interactive room study

Local Three.js 0.169.0 and cannon-es 0.20.0; MIT licenses in vendor/.
All room geometry created for this artwork. Reference video used for interaction and monochrome atmosphere, not copied assets.
Pointer changes horizontal gravity; drag applies a damped force to the selected rigid body. Arrow keys disturb gravity; R resets. Offscreen simulation pauses through the shared activity loop.

Refinement: HDR window bloom; 60 Hz target; 63 ms pointer smoothing time constant. Hollow chest with three loose drawers, pens, notebooks, erasers and tape. Furniture leg collision shapes match visible legs. Contact-based sleep for idle stability.

Physics refinement: 120 Hz fixed substeps (up to 10), bounded linear/angular speeds, solid window grid/sill and door architrave. Door uses a Cannon hinge with soft opening limits and a real wall aperture. Tilt-derived gravity and edge-weighted input replace unrelated slide forces.

Interaction tuning: ordinary slatted wooden chairs; stronger midrange response, lower friction and damping; 120 Hz physics and speed limits retained. Increased highlight bloom and lifted shadows.

Cable revision: ten physical links with distance joints and a separate lamp attachment, interpolated into a flexible tube. Visible geometry support checks supplement floor contacts. Sofa and drawer contact friction 0.045; curtain opacity increased to stay readable through bloom.

Startup revision: settle loose contents with large furniture held static, then restore dynamic masses and save a sleeping reset state. Two independent gathered curtain panels flank an open centre. Moderated large-furniture damping and slightly increased highlight bloom.

Contact revision: floor-lamp centre of mass raised into the pole so it can tip and slide; 14-link flexible pendant cable. Drawers use low-friction runners and front panels clear the carcass sides, with independent loose contents. Curtains resolve contact against oriented compound rigid-body boxes and spheres. Large furniture receives mass-dependent lateral resistance.

Pendant attachment revision: tension-only tether applies at the shade top; slack cable curve shares that exact endpoint. Damped upright torque and a 60-degree tilt limit prevent inversion while preserving the top attachment. Door wall now uses one continuous extruded surface to remove panel seams.

Curtain/interaction revision: sliding rail rings with full-panel fold targets, denser cloth grid and porous depth shadows for partial light transmission. Both lamps use white spotlights with narrow penumbrae. Dragging applies forces at the picked local point through a camera-facing plane, allowing lifting and rotation with bounded release momentum. Continuous wall meshes remove construction seams. Pendant tilt limit increased to 79 degrees.
