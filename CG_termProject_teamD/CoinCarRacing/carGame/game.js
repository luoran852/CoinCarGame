
	var maxSteerVal = 0.5;
	var maxForce = 1000;
	var brakeForce = 1000000;
	var gameState;
	var score=0;
	var rot=2;
	var x1=0;
	var y1=0;
	var z1=0;
	const world = new CANNON.World(); //create cannon world
	var coin1;
	var coin2;
	var coin3;
	var coin4;
	var coin5;
	var coin6;
	var coin7;
	var coin8;

	//to reset coin objects(remeber deleted coins)
	var store_coin = [];

	//gameover Sound
	var gameover_Sound = document.getElementById('audio2');	
	gameover_Sound.volume = 0.5;
	gameover_Sound.currentTime = 0;

	//coin collide sound
	var gameover_Sound2 = document.getElementById('audio2');	
	gameover_Sound2.volume = 0.5;
	gameover_Sound2.currentTime = 0;
	
	
class Game{


	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
		
		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});

		this.container;
		this.stats;
		this.camera;
		this.scene;
		this.renderer;
		this.debug = true;
		this.debugPhysics = true;
		this.fixedTimeStep = 1.0/60.0;
		
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );
		
		const game = this;
		
		this.js = { forward:0, turn:0 };
		
		this.init();
		
		window.onError = function(error){
			console.error(JSON.stringify(error));
		}

	}


	init() {

		document.getElementById('play-btn').onclick = function(){ game.startGame(); };

		//default camera
		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
		this.camera.position.set( 23, 23, 23 );
		//defalut scene
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0xa0a0a0 );
		//default renderer
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.shadowMap.enabled = true;
		this.container.appendChild( this.renderer.domElement );
		
        this.helper = new CannonHelper(this.scene);
        this.helper.addLights(this.renderer);
        
		window.addEventListener( 'resize', function(){ game.onWindowResize(); }, false );

	
		
		this.joystick = new JoyStick({
			game:this,
			onMove:this.joystickCallback
		});


		//skybox
		const game = this;
		const txt_loader = new THREE.CubeTextureLoader();
		txt_loader.setPath( '../images/' );

		var textureCube = txt_loader.load( [
			'px.jpg', 'nx.jpg',
			'py.jpg', 'ny.jpg',
			'pz.jpg', 'nz.jpg'
		] );

		game.scene.background = textureCube;
	
       
         this.initPhysics();
	}
	
	//To apply physics to the scene
	initPhysics(){
		this.physics = {};
		
		const game = this;
       
		this.world = world;
		
		world.broadphase = new CANNON.SAPBroadphase(world);//Test the collision of the body on any axix during several steps
		world.gravity.set(0, -10, 0); // new CANNON.World(0, -10, 0)
		world.defaultContactMaterial.friction = 0;

		const groundMaterial = new CANNON.Material("groundMaterial");
		const wheelMaterial = new CANNON.Material("wheelMaterial");
		//when two materials hit each other 
		const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
			friction: 0.3,
			restitution: 0,
			contactEquationStiffness: 1000
		});

		//add the contact materials to the world
		world.addContactMaterial(wheelGroundContactMaterial);
		
		//2m wide, 1m high, 4m long
		const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
		const chassisBody = new CANNON.Body({ mass: 150, material: groundMaterial });
		chassisBody.addShape(chassisShape);
		chassisBody.position.set(10, 0, 15);
		
		this.helper.addVisual(chassisBody, 'car');

		//camera follow
		this.followCam = new THREE.Object3D();
		//give it camera position
		this.followCam.position.copy(this.camera.position);
		this.scene.add(this.followCam);
		//gonna move along with chassisBody
		this.followCam.parent = chassisBody.threemesh;
        this.helper.shadowTarget = chassisBody.threemesh;

		const options = {
			radius: 0.5,//wheel
			directionLocal: new CANNON.Vec3(0, -1, 0),
			suspensionStiffness: 30,
			suspensionRestLength: 0.3,
			frictionSlip: 5,
			dampingRelaxation: 2.3,
			dampingCompression: 4.4,
			maxSuspensionForce: 100000,
			rollInfluence:  0.01,
			axleLocal: new CANNON.Vec3(-1, 0, 0),
			chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
			maxSuspensionTravel: 0.3,
			customSlidingRotationalSpeed: -30,
			useCustomSlidingRotationalSpeed: true
		};

		// Create the vehicle		
		const vehicle = new CANNON.RaycastVehicle({
			chassisBody: chassisBody,
			indexRightAxis: 0,
			indexUpAxis: 1,
			indeForwardAxis: 2
		});

		//add wheels
		options.chassisConnectionPointLocal.set(1, 0, -1);
		vehicle.addWheel(options);

		options.chassisConnectionPointLocal.set(-1, 0, -1);
		vehicle.addWheel(options);

		options.chassisConnectionPointLocal.set(1, 0, 1);
		vehicle.addWheel(options);

		options.chassisConnectionPointLocal.set(-1, 0, 1);
		vehicle.addWheel(options);

		//add vehicle to the world
		vehicle.addToWorld(world);

		const wheelBodies = [];
		vehicle.wheelInfos.forEach( function(wheel){
			const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20);
			const wheelBody = new CANNON.Body({ mass: 1, material: wheelMaterial });
			const q = new CANNON.Quaternion();
			q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
			wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
			wheelBodies.push(wheelBody);
			game.helper.addVisual(wheelBody, 'wheel');
		});

		// Update wheels
		world.addEventListener('postStep', function(){
			let index = 0;
			game.vehicle.wheelInfos.forEach(function(wheel){
            	game.vehicle.updateWheelTransform(index);
                const t = wheel.worldTransform;
                wheelBodies[index].threemesh.position.copy(t.position);
                wheelBodies[index].threemesh.quaternion.copy(t.quaternion);
				index++; 
			});
		});
		
		this.vehicle = vehicle;

		//create landscape
		let matrix = [];
		let sizeX = 64,
			sizeY = 64;

		for (let i = 0; i < sizeX; i++) {
			matrix.push([]);
			for (var j = 0; j < sizeY; j++) {
				var height = Math.cos(i / sizeX * Math.PI * 5) * Math.cos(j/sizeY * Math.PI * 5) * 2 + 2;
				if(i===0 || i === sizeX-1 || j===0 || j === sizeY-1)
					height = 3;
				matrix[i].push(height);
			}
		}
		
		//floor -> plane
        var floorShape = new CANNON.Plane();
		
            var floorBody = new CANNON.Body({
                mass: 0,//not move
                position: new CANNON.Vec3(0,0,-5),
				
            });
			floorBody.quaternion.setFromAxisAngle( new CANNON.Vec3(1,0,0), -Math.PI/2);//rotate floor 90 degree
            floorBody.addShape(floorShape);
		
            world.addBody(floorBody);
            this.helper.addVisual(floorBody);
				
	
	//////////////////////////////GEOMETRY START/////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////////////////

		//brick texure 
		this.CreateCol(20,0,0,world);
		this.CreateCol(10,0,0,world);
		this.CreateCol(10,0,5,world);
		this.CreateCol(10,0,10,world);
		
		
		this.CreateCol(25,0,0,world);
		this.CreateCol(30,0,0,world);
		this.CreateCol(35,0,0,world);
		this.CreateCol(40,0,0,world);
		
	
		this.CreateCol(40,0,5,world);
		this.CreateCol(40,0,10,world);
		this.CreateCol(40,0,15,world);

		//wood texture cubes
		for(var z=-30;z<0;z+=5){
			this.CreateCol2(20,0,z,world);
		}
		for(var z=-30;z<0;z+=5){
			this.CreateCol2(10,0,z,world);
		}
		

		//TetrahedronGeometry
		this.CreateCol3(-20,0,-20,world)
		this.CreateCol3(30,0,30,world);
		
		//coneGeometry
		this.CreateCol5(30,0,-40,world);
		this.CreateCol5(40,0,-30,world);

		//donut
		this.CreateCol6(-20,0,25,world);
		this.CreateCol6(-20,0,32,world);

		//red brick
		
		for(var x = -30;x<=-10;x+=5){
			this.CreateCol7(x,0,-5,world);
		}
		for(var z = -30;z<=-10;z+=5){
			this.CreateCol7(-10,0,z,world);
		}
		
		for(var z = -30;z<=-15;z+=5){
			this.CreateCol7(-35,0,z,world);
		}
		
		// coin
		coin1=this.CreateCol8(0, 1, 0,2,25,world);
		coin2=this.CreateCol8(0, 2, 5,2,-49,world);
		coin3=this.CreateCol8(0, 3, -40,2,-15,world);
		coin4=this.CreateCol8(0, 4, 39,2,28,world);
		coin5=this.CreateCol8(0, 5, 15,2,-21,world);
		coin6=this.CreateCol8(0, 6, -43,2,18,world);
		coin7=this.CreateCol8(0, 7, -29,2,-21,world);
		coin8=this.CreateCol8(0, 8, 27,2,-35,world);
	
		
		this.animate();
	}

	startGame(){
      
        //Hide the GUI
		const game = this;
        const gui = [ 'play-btn', 'message', 'title'];
        gui.forEach(function(id){
            document.getElementById(id).style.display = 'none';
        })
        
        
		let time = document.getElementById('parent');

		// Start Timer and show remaining time
		let initTime = 30;
		score = 0;
		var timer;
		console.log(initTime + '초');

		var timer = setInterval(function() {
			if (initTime >0) {
				initTime = initTime-1;
				time.innerText = 'Score: ' + score + ' Time: ' + initTime + ' sec';
			}
			else {
				clearInterval(timer);
				console.log('end');
				var reset = document.getElementById('reset-btn');
				reset.style.display = "block";
				
				
				
				gameover_Sound.play();
			
				document.getElementById('reset-btn').onclick = function(){ game.test(); };
				
			}
		}, 1000);

    }

	 test()
	 {
		
		//restore remove coins
		for(var i=0; i<store_coin.length;i++){
			var num = store_coin[i];
			if(num==1)
				coin1=this.CreateCol8(0, 1, 0,2,25,world);
				else if(num==2)
				coin2=this.CreateCol8(0, 2, 5,2,-49,world);
				else if(num==3)
				coin3=this.CreateCol8(0, 3, -40,2,-15,world);
				else if(num==4)
				coin4=this.CreateCol8(0, 4, 39,2,28,world);
				else if(num==5)
				coin5=this.CreateCol8(0, 5, 15,2,-21,world);
				else if(num==6)
				coin6=this.CreateCol8(0, 6, -43,2,18,world);
				else if(num==7)
				coin7=this.CreateCol8(0, 7, -29,2,-21,world);
				else if(num==8)
				coin8=this.CreateCol8(0, 8, 27,2,-35,world);

		}
		//init reset store_coin
		store_coin = [];

		//Hide the GUI
		const game = this;
        const gui = [ 'play-btn', 'message', 'title'];
        gui.forEach(function(id){
            document.getElementById(id).style.display = 'none';
        })
        
        
		let time = document.getElementById('parent');

		// Start Timer and show remaining time
		// Restart Score
		let initTime = 30;
		score = 0;
		var timer;
		console.log(initTime + '초');

		var timer = setInterval(function() {
			var reset = document.getElementById('reset-btn');
			
			reset.style.display = "none";
			
			if (initTime >0) {
				initTime = initTime-1;
				time.innerText = 'Score: ' + score + ' Time: ' + initTime + ' sec';
			}
			else {
				clearInterval(timer);
				console.log('end');
			
				reset.style.display = "block";
			
				gameover_Sound2.play();
			
																		
			}
		}, 1000);

		//reset vehicle position
	 	this.vehicle.chassisBody.position.set(10, 0, 15);
		 
		this.options.chassisConnectionPointLocal.set(1, 0, -1);
		this.options.chassisConnectionPointLocal.set(-1, 0, -1);
		this.options.chassisConnectionPointLocal.set(1, 0, 1);
		this.options.chassisConnectionPointLocal.set(-1, 0, 1);

		this.vehicle.quaternion.setFromAxisAngle( new CANNON.Vec3(1,0,0), -Math.PI/2);
	
	}


	CreateCol(X,Y,Z,world) //Create box
	{
		this.world=world;	
		
		var box=createBox();

		function createBox() {
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			return new THREE.Mesh(
				new THREE.CubeGeometry(5,5,5),
				new THREE.MeshPhongMaterial({
					map:         loader.load('./images/brick.jpg'),
												
				})
			);
		}
			
		this.scene.add(box);
			
		var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
		var body=new CANNON.Body({mass:0});
		body.addShape(shape);

		box.position.set( X, Y, Z );
		box.useQuaternion = true;
		box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 32 );
		body.position.set( X,Y, Z );
		body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
		world.add( body );
		//collision detection
		body.addEventListener('collide', this.coll);
	}

	

	//Create wood texture cubes
	CreateCol2(X,Y,Z,world) 
	{

		this.world=world;
		
		var box=createBox();

		function createBox() {
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			return new THREE.Mesh(
				new THREE.CubeGeometry(2,4,10),
				new THREE.MeshPhongMaterial({
					map:         loader.load('images/tree.jpg'),							
				})
			);
		}

		this.scene.add(box);

		var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
		var body=new CANNON.Body({mass:0});
		body.addShape(shape);
 
		box.position.set( X, Y, Z );
		box.useQuaternion = true;
		box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 32 );
		body.position.set( X,Y, Z );
		body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
		world.add( body );
		body.addEventListener('collide',  this.coll);//collistion detect
		
	}

	//Create tetrahedronGeometry(사면체)
	CreateCol3(X,Y,Z,world) 
	{

		this.world=world;
		
		var box=createBox();

		function createBox() {
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			return new THREE.Mesh(
				new THREE.TetrahedronGeometry(4),
				new THREE.MeshPhongMaterial({
					map:         loader.load('images/crack.jpg'),							
				})
			);
		}
		
		this.scene.add(box);

		var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
		var body=new CANNON.Body({mass:0});
		body.addShape(shape);

		box.position.set( X, Y, Z );
		box.useQuaternion = true;
		box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 32 );
		body.position.set( X,Y, Z );
		body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
		world.add( body );
		body.addEventListener('collide',  this.coll);//collistion detect

	}

	//Create tube geometry
	CreateCol4(X,Y,Z,world) 
	{
		class CustomSinCurve extends THREE.Curve {
			constructor(scale) {
			  super();
			  this.scale = scale;
			}
			getPoint(t) {
			  const tx = t * 3 - 1.5;
			  const ty = Math.sin(2 * Math.PI * t);
			  const tz = 0;
			  return new THREE.Vector3(tx, ty, tz).multiplyScalar(this.scale);
			}
		  }
		const path = new CustomSinCurve(4);

		var box=createBox();

		function createBox() {
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			return new THREE.Mesh(
				new THREE.TubeGeometry(path,44,2.3,8,true),
				new THREE.MeshPhongMaterial({
					map:         loader.load('images/flower.jpg'),							
				})
			);
		}
		
		this.scene.add(box);

		var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
		var body=new CANNON.Body({mass:0});
		body.addShape(shape);

		box.position.set( X, Y, Z );
		box.useQuaternion = true;
		box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 32 );
		body.position.set( X,Y, Z );
		body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
		world.add( body );
		body.addEventListener('collide',  this.coll);//collistion detect

	}

	//Create cone geometry
	CreateCol5(X,Y,Z,world) 
	{

		this.world=world;
		
		var box=createBox();

		function createBox() {
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			return new THREE.Mesh(
				new THREE.ConeGeometry(7,15,35),
				new THREE.MeshPhongMaterial({
					map:         loader.load('images/colorful.png'),							
				})
			);
		}
		
		this.scene.add(box);

		var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
		var body=new CANNON.Body({mass:0});
		body.addShape(shape);

		box.position.set( X, Y, Z );
		box.useQuaternion = true;
		box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 32 );
		body.position.set( X,Y, Z );
		body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
		world.add( body );
		body.addEventListener('collide',  this.coll);//collistion detect

	}

	//Create donutGeometry
	CreateCol6(X,Y,Z,world) 
	{

		this.world=world;
		
		var box=createBox();

		function createBox() {
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			return new THREE.Mesh(
				new THREE.TorusGeometry(6,3,17,45),
				new THREE.MeshPhongMaterial({
					map:         loader.load('images/lion.jpg'),							
				})
			);
		}
		
		this.scene.add(box);

		var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
		var body=new CANNON.Body({mass:0});
		body.addShape(shape);

		box.position.set( X, Y, Z );
		box.useQuaternion = true;
		box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 32 );
		body.position.set( X,Y, Z );
		body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
		world.add( body );
		body.addEventListener('collide',  this.coll);//collistion detect

	}

	//Create red bricks boxes
	CreateCol7(X,Y,Z,world)
	{


		this.world=world;

		
		var box=createBox();


		function createBox() {
			
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			return new THREE.Mesh(
				

				new THREE.CubeGeometry(5,5,5),
				new THREE.MeshPhongMaterial({
					map:         loader.load('images/red_brick.jpg'),//brick.jpg로 바꿔 적용							
				})
			);
		}
		
		this.scene.add(box);
				
		var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
		var body=new CANNON.Body({mass:0});
		body.addShape(shape);

		box.position.set( X, Y, Z );
		box.useQuaternion = true;
		box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), -Math.PI / 32 );
		body.position.set( X,Y, Z );
		body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
		world.add( body );
		body.addEventListener('collide',  this.coll);//collistion detect


	}

	//Create coin Geometry
	CreateCol8(f, num, X,Y,Z,world) 
	{

		var flag = f; // 0: create coin, 1: remove coin
		this.world=world;
		
		var box=createBox();

		function createBox() {
			var loader = new THREE.TextureLoader();
			loader.setCrossOrigin("anonymous");
			var geom = new THREE.Mesh(
				new THREE.CylinderGeometry(2, 2, 1, 100),
			
				new THREE.MeshPhongMaterial({
					map:         loader.load('images/coin.png'), // coin texture								
				})
				
			);
			
			return geom;
		}


		if (flag == 0) { // create coins
			box.name = 'coin' + num;
			this.scene.add(box);
			var shape=new CANNON.Box(new CANNON.Vec3(2.5,2.5,2.5));
			var body=new CANNON.Body({mass:0});
			body.addShape(shape);

			box.position.set( X, Y, Z );
			box.useQuaternion = true;
			box.quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0, 1 ), Math.PI / 2); //Coin rotate
			body.position.set( X,Y, Z );
			body.quaternion.set( box.quaternion.x, box.quaternion.y, box.quaternion.z, box.quaternion.w );
			body.name = 'coin' + num;
			world.add( body );
			// Collision detection
			// Event will be processed when a collision is detected.
			body.addEventListener('collide',  (e) => {
				console.log(e);
				const impactStrength = e.contact.getImpactVelocityAlongNormal()//충돌강도
			
				if(impactStrength < 1.5)
				{
					console.log("hihi");
				}
				else if(impactStrength > 1.5&&impactStrength<3.0)
				{
					console.log("www");
				}
				else if(impactStrength > 3.0)
				{
					console.log("hhh");
					this.world=world;
					score = score + 5; // Adds 5 points when colliding with a coin

					
	  				//Collision sounds
	  				  var hitSound = document.getElementById('audio3');
					  hitSound.volume = 0.5;
					  hitSound.currentTime = 0;
					  hitSound.play();

					switch(num) {
						case 1:
							this.CreateCol8(1, 1, 0,2,25,world);
							console.log("코인"+1+"제거됨");
							break;
						case 2:
							this.CreateCol8(1, 2, 5,2,-49,world);
							console.log("코인"+2+"제거됨");
							break;
						case 3:
							this.CreateCol8(1, 3, -40,2,-15,world);
							console.log("코인"+3+"제거됨");
							break;
						case 4:
							this.CreateCol8(1, 4, 39,2,28,world);
							console.log("코인"+4+"제거됨");
							break;
						case 5:
							this.CreateCol8(1, 5, 15,2,-21,world);
							console.log("코인"+5+"제거됨");
							break;
						case 6:
							this.CreateCol8(1, 6, -43,2,18,world);
							console.log("코인"+6+"제거됨");
							break;
						case 7:
							this.CreateCol8(1, 7, -29,2,-21,world);
							console.log("코인"+7+"제거됨");
							break;
						case 8:
							this.CreateCol8(1, 8, 27,2,-35,world);
							console.log("코인"+8+"제거됨");
							break;
					}
				
				}
			});
			console.log("flag == 0 " + box.name);
		}
		
		if (flag == 1) { // remove coins
				if(num==1)
				world.removeBody(coin1);
				else if(num==2)
				world.removeBody(coin2);
				else if(num==3)
				world.removeBody(coin3);
				else if(num==4)
				world.removeBody(coin4);
				else if(num==5)
				world.removeBody(coin5);
				else if(num==6)
				world.removeBody(coin6);
				else if(num==7)
				world.removeBody(coin7);
				else if(num==8)
				world.removeBody(coin8);

				store_coin += num;
				//alert(store_coin);

			this.scene.remove(this.scene.getObjectByName('coin' + num));
			this.animate();
			console.log("flag == 1" + box.name);
		}
		
		return body;

			
	}
	
	///////////////////////////////////////////////////////////////////////////////////////
	//////////////////////////////GEOMETRY FINISH/////////////////////////////////////////
	
	
	joystickCallback( forward, turn ){
		this.js.forward = forward;
		this.js.turn = -turn;
	}
	updateDrive(forward=this.js.forward, turn=this.js.turn){
		
		//adjust these(fast, break, steer)
		const maxSteerVal = 0.5;//(-0.5~0.5)
        const maxForce = 1000;//(-1000~1000)
        const brakeForce = 10;
		 
		const force = maxForce * forward;
		const steer = maxSteerVal * turn;
		 
	
		if (forward!=0){
			this.vehicle.setBrake(0, 0);
			this.vehicle.setBrake(0, 1);
			this.vehicle.setBrake(0, 2);
			this.vehicle.setBrake(0, 3);

			this.vehicle.applyEngineForce(force, 2);
			this.vehicle.applyEngineForce(force, 3);
	 	}else{
			this.vehicle.setBrake(brakeForce, 0);
			this.vehicle.setBrake(brakeForce, 1);
			this.vehicle.setBrake(brakeForce, 2);
			this.vehicle.setBrake(brakeForce, 3);
		}
		
		this.vehicle.setSteeringValue(steer, 0);
		this.vehicle.setSteeringValue(steer, 1);
	}
	
	
   
	
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize( window.innerWidth, window.innerHeight );

	}

	updateCamera(){
		this.camera.position.lerp(this.followCam.getWorldPosition(new THREE.Vector3()), 0.05);
		this.camera.lookAt(this.vehicle.chassisBody.threemesh.position);
        if (this.helper.sun!=undefined){
			this.helper.sun.position.copy( this.camera.position );
			this.helper.sun.position.y += 10;
		}
	}


	//visulaization						   
	animate() {
		const game = this;
		
		requestAnimationFrame( function(){ game.animate(); } );
		
		const now = Date.now();
		if (this.lastTime===undefined) this.lastTime = now;
		const dt = (Date.now() - this.lastTime)/1000.0;
		this.FPSFactor = dt;
		this.lastTime = now;
		
		this.world.step(this.fixedTimeStep, dt);
		this.helper.updateBodies(this.world);
		
		this.updateDrive();
		
		this.updateCamera();
		
		this.renderer.render( this.scene, this.camera );

		if (this.stats!=undefined) this.stats.update();

	}
}

class JoyStick{
	constructor(options){
		const circle = document.createElement("div");
		circle.style.cssText = "position:absolute; bottom:35px; width:80px; height:80px; background:rgba(126, 126, 126, 0.5); border:#444 solid medium; border-radius:50%; left:50%; transform:translateX(-50%);";
		const thumb = document.createElement("div");
		thumb.style.cssText = "position: absolute; left: 20px; top: 20px; width: 40px; height: 40px; border-radius: 50%; background: #fff;";
		circle.appendChild(thumb);
		document.body.appendChild(circle);
		this.domElement = thumb;
		this.maxRadius = options.maxRadius || 40;
		this.maxRadiusSquared = this.maxRadius * this.maxRadius;
		this.onMove = options.onMove;
		this.game = options.game;
		this.origin = { left:this.domElement.offsetLeft, top:this.domElement.offsetTop };
		this.rotationDamping = options.rotationDamping || 0.06;
		this.moveDamping = options.moveDamping || 0.01;
		if (this.domElement!=undefined){
			const joystick = this;
			if ('ontouchstart' in window){
				this.domElement.addEventListener('touchstart', function(evt){ joystick.tap(evt); });
			}else{
				this.domElement.addEventListener('mousedown', function(evt){ joystick.tap(evt); });
			}
		}

	
		
	}
	
	getMousePosition(evt){
		let clientX = evt.targetTouches ? evt.targetTouches[0].pageX : evt.clientX;
		let clientY = evt.targetTouches ? evt.targetTouches[0].pageY : evt.clientY;
		return { x:clientX, y:clientY };
	}
	
	tap(evt){
		evt = evt || window.event;
		// get the mouse cursor position at startup:
		this.offset = this.getMousePosition(evt);
		const joystick = this;
		if ('ontouchstart' in window){
			document.ontouchmove = function(evt){ joystick.move(evt); };
			document.ontouchend =  function(evt){ joystick.up(evt); };
		}else{
			document.onmousemove = function(evt){ joystick.move(evt); };
			document.onmouseup = function(evt){ joystick.up(evt); };
		}
	}
	
	move(evt){
		evt = evt || window.event;
		const mouse = this.getMousePosition(evt);
		// calculate the new cursor position
		let left = mouse.x - this.offset.x;
		let top = mouse.y - this.offset.y;
		
		const sqMag = left*left + top*top;
		if (sqMag>this.maxRadiusSquared){
			//Only use sqrt if essential
			const magnitude = Math.sqrt(sqMag);
			left /= magnitude;
			top /= magnitude;
			left *= this.maxRadius;
			top *= this.maxRadius;
		}
		// set the element's new position:
		this.domElement.style.top = `${top + this.domElement.clientHeight/2}px`;
		this.domElement.style.left = `${left + this.domElement.clientWidth/2}px`;
		
		const forward = -(top - this.origin.top + this.domElement.clientHeight/2)/this.maxRadius;
		const turn = (left - this.origin.left + this.domElement.clientWidth/2)/this.maxRadius;
		
		if (this.onMove!=undefined) this.onMove.call(this.game, forward, turn);
	}
	
	up(evt){
		if ('ontouchstart' in window){
			document.ontouchmove = null;
			document.touchend = null;
		}else{
			document.onmousemove = null;
			document.onmouseup = null;
		}
		this.domElement.style.top = `${this.origin.top}px`;
		this.domElement.style.left = `${this.origin.left}px`;
		
		this.onMove.call(this.game, 0, 0);
	}
}
//cannon.js
class CannonHelper{
    constructor(scene){
        this.scene = scene;
    }
    
    addLights(renderer){
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

        // LIGHTS
        const ambient = new THREE.AmbientLight( 0x888888 );
        this.scene.add( ambient );

        const light = new THREE.DirectionalLight( 0xdddddd );
        light.position.set( 3, 10, 4 );
        light.target.position.set( 0, 0, 0 );

        light.castShadow = true;

        const lightSize = 10;
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 50;
        light.shadow.camera.left = light.shadow.camera.bottom = -lightSize;
        light.shadow.camera.right = light.shadow.camera.top = lightSize;

        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;

        this.sun = light;
        this.scene.add(light);    
    }
    
    set shadowTarget(obj){
        if (this.sun!==undefined) this.sun.target = obj;    
    }
    
    createCannonTrimesh(geometry){
		if (!geometry.isBufferGeometry) return null;
		
		const posAttr = geometry.attributes.position;
		const vertices = geometry.attributes.position.array;
		let indices = [];
		for(let i=0; i<posAttr.count; i++){
			indices.push(i);
		}
		
		return new CANNON.Trimesh(vertices, indices);
	}
	
	createCannonConvex(geometry){
		if (!geometry.isBufferGeometry) return null;
		
		const posAttr = geometry.attributes.position;
		const floats = geometry.attributes.position.array;
		const vertices = [];
		const faces = [];
		let face = [];
		let index = 0;
		for(let i=0; i<posAttr.count; i+=3){
			vertices.push( new CANNON.Vec3(floats[i], floats[i+1], floats[i+2]) );
			face.push(index++);
			if (face.length==3){
				faces.push(face);
				face = [];
			}
		}
		
		return new CANNON.ConvexPolyhedron(vertices, faces);
	}
    //addvisual helper in cannon.js
    addVisual(body, name, castShadow=true, receiveShadow=true){
		body.name = name;
		if (this.currentMaterial===undefined) this.currentMaterial = new THREE.MeshLambertMaterial({color:0x000000});
		if (this.settings===undefined){
			this.settings = {
				stepFrequency: 60,
				quatNormalizeSkip: 2,
				quatNormalizeFast: true,
				gx: 0,
				gy: 0,
				gz: 0,
				iterations: 3,
				tolerance: 0.0001,
				k: 1e6,
				d: 3,
				scene: 0,
				paused: false,
				rendermode: "solid",
				constraints: false,
				contacts: false,  // Contact points
				cm2contact: false, // center of mass to contact points
				normals: false, // contact normals
				axes: false, // "local" frame axes
				particleSize: 0.1,
				shadows: false,
				aabbs: false,
				profiling: false,
				maxSubSteps:3
			}
			this.particleGeo = new THREE.SphereGeometry( 1, 16, 8 );
			this.particleMaterial = new THREE.MeshLambertMaterial( { color: 0xCD1039 } );
		}
		// What geometry should be used?
		let mesh;
	
		if(body instanceof CANNON.Body) 
			mesh = this.shape2Mesh(body);//(body, castShadow, receiveShadow);
		
		
	

		if(mesh) {
			// Add body
			body.threemesh = mesh;
            mesh.castShadow = castShadow;
            mesh.receiveShadow = receiveShadow;
			this.scene.add(mesh);
		}
	}
	
	shape2Mesh(body, castShadow, receiveShadow){
		const obj = new THREE.Object3D();
		const material = this.currentMaterial;
		const game = this;
		let index = 0;
		
		body.shapes.forEach (function(shape){
			let mesh;
			let geometry;
			let v0, v1, v2;

			switch(shape.type){

			case CANNON.Shape.types.SPHERE:
				const sphere_geometry = new THREE.SphereGeometry( shape.radius, 8, 8);
			
			
				mesh = new THREE.Mesh( sphere_geometry, material );
				break;

			case CANNON.Shape.types.PARTICLE:
				mesh = new THREE.Mesh( game.particleGeo, game.particleMaterial );
				const s = this.settings;
				mesh.scale.set(s.particleSize,s.particleSize,s.particleSize);
				break;

			case CANNON.Shape.types.PLANE:
				geometry = new THREE.PlaneGeometry(0, 0, 4, 4);
				mesh = new THREE.Object3D();
				const submesh = new THREE.Object3D();
					
			var loader = new THREE.TextureLoader();
			//floor texture
			
			var material1=new THREE.MeshBasicMaterial({map:loader.load('./images/lawn.jpg')});


				const ground = new THREE.Mesh( geometry, material1 );
			
				ground.scale.set(100, 100, 100);
				submesh.add(ground);
				ground.castShadow = true;
				ground.receiveShadow = true;

				mesh.add(submesh);
				break;

			case CANNON.Shape.types.BOX:
				const box_geometry = new THREE.BoxGeometry(  shape.halfExtents.x*2,
															shape.halfExtents.y*2,
															shape.halfExtents.z*2 );
															

															var loader = new THREE.TextureLoader();
															//car texture
															var material1=new THREE.MeshBasicMaterial({map:loader.load('./images/car.jpg')});
																									
				mesh = new THREE.Mesh( box_geometry, material1 );
				break;

			case CANNON.Shape.types.CONVEXPOLYHEDRON:
				const geo = new THREE.Geometry();

				// Add vertices
				shape.vertices.forEach(function(v){
					geo.vertices.push(new THREE.Vector3(v.x, v.y, v.z));
				});

				shape.faces.forEach(function(face){
					// add triangles
					const a = face[0];
					for (let j = 1; j < face.length - 1; j++) {
						const b = face[j];
						const c = face[j + 1];
						geo.faces.push(new THREE.Face3(a, b, c));
					}
				});
				geo.computeBoundingSphere();
				geo.computeFaceNormals();
				var loader = new THREE.TextureLoader();
				//wheel texture
				var material1=new THREE.MeshBasicMaterial({map:loader.load('./images/white.jpg')});
			
				mesh = new THREE.Mesh( geo, material1 );
				break;

			case CANNON.Shape.types.HEIGHTFIELD:
				geometry = new THREE.Geometry();

				v0 = new CANNON.Vec3();
				v1 = new CANNON.Vec3();
				v2 = new CANNON.Vec3();
				for (let xi = 0; xi < shape.data.length - 1; xi++) {
					for (let yi = 0; yi < shape.data[xi].length - 1; yi++) {
						for (let k = 0; k < 2; k++) {
							shape.getConvexTrianglePillar(xi, yi, k===0);
							v0.copy(shape.pillarConvex.vertices[0]);
							v1.copy(shape.pillarConvex.vertices[1]);
							v2.copy(shape.pillarConvex.vertices[2]);
							v0.vadd(shape.pillarOffset, v0);
							v1.vadd(shape.pillarOffset, v1);
							v2.vadd(shape.pillarOffset, v2);
							geometry.vertices.push(
								new THREE.Vector3(v0.x, v0.y, v0.z),
								new THREE.Vector3(v1.x, v1.y, v1.z),
								new THREE.Vector3(v2.x, v2.y, v2.z)
							);
							var i = geometry.vertices.length - 3;
							geometry.faces.push(new THREE.Face3(i, i+1, i+2));
						}
					}
				}
				geometry.computeBoundingSphere();
				geometry.computeFaceNormals();
				mesh = new THREE.Mesh(geometry, material);
				break;

			case CANNON.Shape.types.TRIMESH:
				geometry = new THREE.Geometry();

				v0 = new CANNON.Vec3();
				v1 = new CANNON.Vec3();
				v2 = new CANNON.Vec3();
				for (let i = 0; i < shape.indices.length / 3; i++) {
					shape.getTriangleVertices(i, v0, v1, v2);
					geometry.vertices.push(
						new THREE.Vector3(v0.x, v0.y, v0.z),
						new THREE.Vector3(v1.x, v1.y, v1.z),
						new THREE.Vector3(v2.x, v2.y, v2.z)
					);
					var j = geometry.vertices.length - 3;
					geometry.faces.push(new THREE.Face3(j, j+1, j+2));
				}
				geometry.computeBoundingSphere();
				geometry.computeFaceNormals();
				
				mesh = new THREE.Mesh(geometry, MutationRecordaterial);
				
				break;

			default:
				throw "Visual type not recognized: "+shape.type;
			}

		
			mesh.receiveShadow = true;
			mesh.castShadow = true;
			if(mesh.children){
				for(var i=0; i<mesh.children.length; i++){
					mesh.children[i].castShadow = true;
					mesh.children[i].receiveShadow = true;
					if(mesh.children[i]){
						for(var j=0; j<mesh.children[i].length; j++){
							mesh.children[i].children[j].castShadow = true;
							mesh.children[i].children[j].receiveShadow = true;
						}
					}
				}
			}

			var o = body.shapeOffsets[index];
			var q = body.shapeOrientations[index++];
			mesh.position.set(o.x, o.y, o.z);
			mesh.quaternion.set(q.x, q.y, q.z, q.w);
				
			

			obj.add(mesh);
		});



		return obj;
	}
    
    updateBodies(world){
        world.bodies.forEach( function(body){
            if ( body.threemesh != undefined){
                body.threemesh.position.copy(body.position);
                body.threemesh.quaternion.copy(body.quaternion);
            }
        });
    }
}
