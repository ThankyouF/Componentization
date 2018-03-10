if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

var container = document.getElementById("container");
var pointbutton = document.getElementById("point");		//锚点
var addbutton = document.getElementById("add");			//增加模型
var tubebutton = document.getElementById("linetube");	//管道

var camera, scene, renderer, controls;
var transformControl;
var hiding;
var plane, raycaster;
var mouse = new THREE.Vector2(), INTERSECTED, INTERSECTED_MODEL;
var gridHelper;
var directionalLight1, directionalLight2, hemiLight;

var rollOverMesh, rollOverMaterial; //移动图标
var boundingBoxGeo = new THREE.BoxGeometry( 1, 1, 1 );

var objects = [];
var ids = []; //页面点击获取模型名字的存储
var boundingbox = []; //从json文件中获取的包围盒尺寸存储
var boundingBoxes = []; //包围盒
var boundingBoxName = []; //包围盒位置信息存储
var boundingBoxHelpers = [];
var models = [];	//模型存储

//var X = 10000; 	//缩放比例
var X;	//缩放比例
var numberofModel = 0; //添加的模型数量
var index = 0; //场景内物体总数
var initScale;	//transformControl初始scale值

var mode = 0;		//定点模型 1：锚点 2：管道 0：变形control
var isDoubleChoose = false;		//多选
var isGroup = false;		//成组
var groupModels = [];
var groupPos = [];
var isAttach = false; //transformcontrol可见
var isGround = false;	//是否搭了地板
var isGet = false;	//是否选择搭建模型
var isRemove = false;	//是否删除模型
var isPoint = false;	//锚点
var isSame = false;		//相同模型
var isTube = false;		//搭管道
var isAdd = false;		//加模型
var addModels = [];
var linePoints = [];
var addModelIndex = 0;
var tubeInfos = [];		//管道信息存储

var index_of_boundingbox = -1;	//鼠标点击获得的包围盒以及模型的index

var uv_img_name;	//地面贴图名字
var uv_size = []; 	//地面贴图长宽数据存储


init();

/**
 * 获取json文档中模型的包围盒大小信息
 */
function initSize() {

    var dataroot="static/data/boundingboxsize.json";
    $.getJSON(dataroot, function(data){ 
        boundingbox = data.boundingbox;
    });

}

/**
 * 锚点确定模型位置存储信息格式
 */
function createModelInfo( pos, modelname, index ) {

	this.position = pos || new THREE.Vector3( 0, 0, 0 );	//模型位置
	this.name = modelname || "undefined";			//模型名字
	this.index = index || -1;			//模型编号

}

/**
 * 管道确定位置信息格式存储
 */
function createTubeInfo( tubename, number, startpos, angle  ) {

	this.name = tubename || "undefined";	//模型名字
	this.number = number || 0;			//一排管道个数
	this.startpos = startpos || new THREE.Vector3( 0, 0, 0 );	//初始管道起始位置
	this.angle = angle || 0;		//管道旋转角度

}


/**
 * 场景初始化
 */
function initScene() {

	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xf0f0f0 ); //场景背景颜色设置

}


/**
 * 相机初始化
 */
function initCamera( index ) {

	switch( index ) {

		//模式1 侧视图
		case 1: 
			camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
			camera.position.set( 500, 800, 1300 );
			camera.lookAt( new THREE.Vector3() );
			break;
		//模式2 鸟瞰图
		case 2:
			camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
			camera.position.set( 0, 1500, 0 );
			camera.lookAt( new THREE.Vector3() );
			break;	

	}

}


/** 
 * 鼠标控制器初始化
 */
function initOribtCtr() {

	controls = new THREE.OrbitControls( camera );
	controls.update();	

}


/**
 * 变换控制器初始化
 */
function initTransformCtr() {

//	controls = new THREE.TrackballControls( camera );

/*	controls.rotateSpeed = 3;		//按住鼠标左键后拖动查看时的速度
	controls.zoomSpeed = 1.2;		//用滚轮调整大小的速度
	controls.panSpeed = 0.8; 		//按住鼠标右键后的平移速度
	controls.noRotate = true;		//设置为true，禁用鼠标左键旋转的功能
	controls.noZoom = false; 		//设置为true，禁用鼠标滚轮调整大小的功能
	controls.noPan = false; 		//设置为true，禁用鼠标右键平移的功能
	controls.staticMoving = true;	//移动速度
	controls.dynamicDampingFactor = 0.3;
*/
//	controls = new THREE.OrbitControls( camera );
//    controls.update();
//    controls.enabled = false;

	//可视化变换控件对象
	transformControl = new THREE.TransformControls( camera, renderer.domElement );
	transformControl.setSize( 0.4 );	//控件初始大小设置
	transformControl.addEventListener( 'change', render );
	scene.add( transformControl );	//控件对象添加到场景对象
//	console.log( transformControl );

	index ++;

}


/**
 * 渲染器初始化
 */
function initRender() {

//	container = document.createElement( 'div' );
//	document.body.appendChild( container );

	raycaster = new THREE.Raycaster();	//射线拾取初始化
	mouse = new THREE.Vector2();	//鼠标坐标初始化

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	container.appendChild( renderer.domElement );

}


/**
 * 灯光初始化
 */
function initLight() {

    hemiLight = new THREE.HemisphereLight( 0xffffff, 0xc0c0c0, 1 );		//半球光
    hemiLight.position.set( 0, 1000, 0 );
    scene.add( hemiLight );
    index ++;

}


/**
 * roll-over helpers
 */
function add() {

	var rollOverGeo = new THREE.BoxGeometry( 1, 1, 1 );
	rollOverMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, opacity: 0.5, transparent: true } );
	rollOverMesh = new THREE.Mesh( rollOverGeo, rollOverMaterial );

}


/**
 * 参考坐标平面
 */
function initGrid() {

	gridHelper = new THREE.GridHelper( 1000, 20 );
	scene.add( gridHelper );

	index ++;

}


/**
 * 参考坐标轴
 */
function addTestInfo() {

    // 参考坐标轴
    var axisHelper = new THREE.AxesHelper(500);
    scene.add( axisHelper );
    index ++;

    renderer.render(scene, camera);

}


/**
 * 增加模型
 */
function loadModel( id ) {

	var daeModel;
	var bbox;	

	var g = new THREE.Group();

    var loader = new THREE.ColladaLoader();	
    var pre_dir = "static/model/";
    var suffix = ".dae";
    var dir = pre_dir + id + suffix;

    loader.load( dir , function (collada) {

        daeModel = collada.scene;
        daeModel.scale.set( 1, 1, 1 );
//		bbox = new 	THREE.BoxHelper( daeModel, 0xff0000 );
		g.add( daeModel );
//		g.add( bbox );

    });

    return g;

}


/**
 * 鼠标、键盘事件监听
 */
function addListener() {

	document.addEventListener( 'mousemove', onDocumentMouseMove, false );	//鼠标移动事件
	document.addEventListener( 'mousedown', onDocumentMouseDown, false );	//鼠标点击事件
	document.addEventListener( 'mouseup', onDocumentMouseUp, false );
//	window.parent.document.addEventListener( 'keypress', onKeyPress, false );	//键盘事件
//	window.parent.document.addEventListener( 'keydown', onKeyDown, false );	//键盘事件
//	window.parent.document.addEventListener( 'keyup', onKeyUp, false );	//键盘事件
	document.addEventListener( 'keydown', onKeyDown, false );	//键盘事件
	document.addEventListener( 'keyup', onKeyUp, false );	//键盘事件
	window.addEventListener( 'resize', onWindowResize, false ); //窗口自适应

}


/**
 * 窗口大小自适应
 */
function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}


/**
 * 键盘按下事件
 */
function onKeyDown( event ) {

	event.preventDefault();
//	console.log( event.keyCode );

	switch ( event.keyCode ) {

		case 16: //shift：模式0=多选模型模式开始 模式1=锚点选择类型相同的模型开始
			if( mode == 1 )
				isSame = true;
			else if( mode == 0 )
				isDoubleChoose = true;
			break;

		case 13: //Enter：模式0=transformcontrol 模式1=锚点模型 模式2=管道模型
//			isAttach = !isAttach;
			if( mode == 1 ) {
				isPoint = false;
				isAdd = true;
//				mode = 0;
//				console.log( mode );				
			}
			else if( mode == 2 ) {
				isTube = false;
				isAdd = true;
//				mode = 0;
			}
			else if( mode == 0 )
				isAttach = !isAttach;

//			transformControl.visible = isAttach;
			break;

		case 97:
		case 49: // 1 平移变换
			transformControl.setMode( "translate" );
			break;

		case 98:
		case 50: // 2 旋转变换
			transformControl.setMode( "rotate" );
			break;

		case 99:
		case 51: // 3 缩放变换
			transformControl.setMode( "scale" );
			break;

		case 187:
		case 107: // +, =, num+ 控制器变大
			transformControl.setSize( transformControl.size + 0.1 );
			break;

		case 189:
		case 109: // -, _, num- 控制器缩小，最小为0.1
			transformControl.setSize( Math.max( transformControl.size - 0.1, 0.1 ) );
			break;			

	}	

	if( event.ctrlKey ) {
		//ctl+g 成组
		if( event.keyCode == 71 ){
			isGroup = true;
			console.log( " group " );
		}
	}

}

/**
 * 键盘释放事件
 */
function onKeyUp( event ) {

	switch ( event.keyCode ) {

		case 16: //shift：模式0=多选模型模式取消 模式1=锚点同一模型模式取消
			if( mode == 1 )
				isSame = false
			else 
				isDoubleChoose = false;
			break;

	}	

}


/**
 * 鼠标移动事件
 */
function onDocumentMouseMove( event ) {

	//直接建立模型情况下 鼠标移动辅助图像

	if( isGet ) {

		var size = getBox( ids[ ids.length - 1 ] );
		X = size[ 2 ];
		rollOverMesh.scale.set( size[ 1 ].x * X, size[ 1 ].y * X, size[ 1 ].z * X);	//缩放成与选中的模型的包围盒大小

		scene.add( rollOverMesh );		//辅助鼠标移动图标

		event.preventDefault();

		mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

		raycaster.setFromCamera( mouse, camera );

		var intersects = raycaster.intersectObjects( objects );

		if ( intersects.length > 0 ) {

			var intersect = intersects[ 0 ];

			rollOverMesh.position.copy( intersect.point ).add( intersect.face.normal );
			rollOverMesh.position.divideScalar( size[ 1 ].x * X ).floor().multiplyScalar( size[ 1 ].x * X ).addScalar( size[ 1 ].y / 2 * X);

		}

		render();		

	}

}


/**
 * 鼠标点击事件
 */
function onDocumentMouseDown( event ) {

	var btnNum = event.button;	//获取鼠标按键情况

	//左键点击事件
	if( btnNum == 0 ){
		//造地
		if( isGround ) {
//			console.log("1");

			var aspect = uv_size[ 0 ] / uv_size[ 1 ];

			var dir = "static/uv_img/" + uv_img_name;
			var voxelMaterial = new THREE.MeshLambertMaterial( { map: THREE.ImageUtils.loadTexture( dir ) } );
			var voxelGeometry = new THREE.BoxGeometry( 1000, 20, 1000 * aspect );

			//UV贴图 
			var voxelImg = [
				new THREE.Vector2( 0, 0.5 ),
				new THREE.Vector2( 1, 0.5 ),
				new THREE.Vector2( 1, 1 ),
				new THREE.Vector2( 0, 1 )
			];

			var voxelImgElse = [
				new THREE.Vector2( 0, 0 ),
				new THREE.Vector2( 1, 0 ),
				new THREE.Vector2( 1, 0.5 ),
				new THREE.Vector2( 0, 0.5 )
			];			

		    voxelGeometry.faceVertexUvs[ 0 ] = [];

		    voxelGeometry.faceVertexUvs[0][4] = [ voxelImg[0], voxelImg[1], voxelImg[3] ];
		    voxelGeometry.faceVertexUvs[0][5] = [ voxelImg[1], voxelImg[2], voxelImg[3] ];

		    voxelGeometry.faceVertexUvs[0][0] = [ voxelImgElse[0], voxelImgElse[1], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][1] = [ voxelImgElse[1], voxelImgElse[2], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][2] = [ voxelImgElse[0], voxelImgElse[1], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][3] = [ voxelImgElse[1], voxelImgElse[2], voxelImgElse[3] ];		    
		    voxelGeometry.faceVertexUvs[0][6] = [ voxelImgElse[0], voxelImgElse[1], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][7] = [ voxelImgElse[1], voxelImgElse[2], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][8] = [ voxelImgElse[0], voxelImgElse[1], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][9] = [ voxelImgElse[1], voxelImgElse[2], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][10] = [ voxelImgElse[0], voxelImgElse[1], voxelImgElse[3] ];
		    voxelGeometry.faceVertexUvs[0][11] = [ voxelImgElse[1], voxelImgElse[2], voxelImgElse[3] ];

		    var voxel = new THREE.Mesh( voxelGeometry, voxelMaterial );

			//模型位置设置
			voxel.position.set( 0, -10, 0 );			
			scene.add( voxel );		//场景中添加模型
			index ++;		//场景中物体格式+1

			gridHelper.visible = false;

			objects.push( voxel );
//			objects.push( plane );

		    changeButtonStyle( pointbutton, 1 );
		    changeButtonStyle( tubebutton, 1 );

			isGround = false;

		}		

		event.preventDefault();	

		//锚点
		if( isPoint ) {

			var vector = new THREE.Vector3();//三维坐标对象
			vector.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
			vector.unproject( camera );

			var rayc = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
			var intersects = rayc.intersectObjects( scene.children );

			if ( intersects.length > 0 ) {

				var selected = intersects[ 0 ];//取第一个物体
				var helperm = new THREE.OctahedronGeometry( 5, 0 );		//定点辅助标记 四棱锥

				//模型相同的情况 按着shift进行点位置确认不用再次点击模型
				if( isSame ) {
					//存储的相同模型的信息复制
					var preinfo = addModels[ addModels.length - 1 ];	//前一个模型信息
					var newinfo = new createModelInfo( selected.point, preinfo.name, preinfo.index + 1 );	//拷贝前一个模型信息
					addModelIndex ++;
					addModels.push( newinfo );	//信息存储
					//重复的图标颜色设置成黄色
					var helpermt = new THREE.MeshBasicMaterial( { color: 0xffff00 } );	//标记颜色
					var helpermesh = new THREE.Mesh( helperm, helpermt );						
					helpermesh.position.set( selected.point.x, selected.point.y, selected.point.z );	//将辅助标记的位置确定在鼠标点击的位置			
					scene.add( helpermesh );	//场景中增加辅助标记
					index ++;		//场景中总物体数+1			

				}
				
				else {
					//新建锚点
					var test = new createModelInfo( selected.point );
					addModels.push( test );
					var helpermt = new THREE.MeshBasicMaterial( { color: 0xff0000 } );//没有确定模型的情况下点为红色
					var helpermesh = new THREE.Mesh( helperm, helpermt );					
					helpermesh.position.set( selected.point.x, selected.point.y, selected.point.z );	
					scene.add( helpermesh );
					index ++;	

				}
	
			}

		}

		//搭油管
		if( isTube ) {
			var vector = new THREE.Vector3();//三维坐标对象
			vector.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
			vector.unproject( camera );

			var rayc = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
			var intersects = rayc.intersectObjects( scene.children );	

			if ( intersects.length > 0 ) {

				var selected = intersects[ 0 ];//鼠标点击
				var pos = new THREE.Vector3( selected.point.x, selected.point.y, selected.point.z );//获取点击位置的点坐标
				//标记
				var helperm = new THREE.OctahedronGeometry( 5, 0 );
				var helpermt = new THREE.MeshBasicMaterial( { color: 0xff0000 } );//没有确定模型的情况下点为红色
				var helpermesh = new THREE.Mesh( helperm, helpermt );					

				if( linePoints.length > 0 ) {
					var tubeInfo = new createTubeInfo();
					tubeInfo.startpos = linePoints[ linePoints.length - 1 ];
					tubeInfos.push( tubeInfo );
				}

				linePoints.push( pos );
				helpermesh.position.set( pos.x, pos.y, pos.z );				
				scene.add( helpermesh );
				index ++;						

			}
					
		}

		//没有建立锚点的情况下直接选择模型
		if( isGet ) {

			mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );
			raycaster.setFromCamera( mouse, camera );

			var intersects = raycaster.intersectObjects( objects );

			if ( intersects.length > 0 ) {

				var intersect = intersects[ 0 ];

				var voxelMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, visible: false, transparent: true } );
				
				var Box = getBox( ids[ ids.length - 1 ] );//获取包围盒信息
				X = Box[ 2 ];	//获取缩放倍数
				var voxel = new THREE.Mesh( Box[ 0 ], voxelMaterial );	//包围盒
				voxel.scale.set( X, X, X );	//缩放包围盒

				//获取鼠标点击位置
				voxel.position.copy( intersect.point ).add( intersect.face.normal );
				voxel.position.divideScalar( Box[ 1 ].x * X ).floor().multiplyScalar( Box[ 1 ].x * X ).addScalar( Box[ 1 ].y / 2 * X);
				
				voxel.name = ids[ ids.length - 1 ] + boundingBoxName.length;	//设置包围盒名字

				voxel.position.y = voxel.position.y - Box[ 1 ].y * X / 2;

				var pos = new THREE.Vector3();
				pos.x = voxel.position.x;
				pos.y = voxel.position.y;
				pos.z = voxel.position.z;

				var model = loadModel( ids[ ids.length - 1 ] );	//加载模型
				model.scale.set( X, X, X );	//放大
				model.position.set( pos.x, pos.y, pos.z );	//设置模型位置

			
				scene.add( voxel );		//场景中添加包围盒
				scene.add( model );		//场景中添加模型
				index = index + 2;		//场景中物体格式+1

				objects.push( voxel );
				boundingBoxes.push( voxel );
				models.push( model );
				boundingBoxName.push( voxel.name );
				scene.remove( rollOverMesh );

				isGet = false;

			}	

		}		


	}
	//右键点击事件
	else {
//		console.log( index );

		if( index > 4 ) {

			event.preventDefault();

			mouse.set( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1 );

            //鼠标射线拾取
            raycaster.setFromCamera( mouse, camera );

            var intersects = raycaster.intersectObjects( boundingBoxes );

            if ( intersects.length > 0 ) {

                if ( INTERSECTED != intersects[ 0 ].object ) {

                    if ( INTERSECTED && !isDoubleChoose ) {

							INTERSECTED.material.visible = false;

                    }


                    INTERSECTED = intersects[ 0 ].object;

                    var name = INTERSECTED.name;
//                    console.log( name );
                    index_of_boundingbox = returnIndex( name );
//                    console.log( index_of_boundingbox );

                    INTERSECTED.material.visible = true;
					INTERSECTED.material.opacity = 0.5;

					var pos = new THREE.Vector3( INTERSECTED.position.x, INTERSECTED.position.y, INTERSECTED.position.z );
//					console.log( pos );

					if( isDoubleChoose ) {

						groupModels.push( index_of_boundingbox );
						groupPos.push( pos );
						groupModels.sort();

					}

                }

            } 
            else {
       	
                if ( INTERSECTED ) {

                	index_of_boundingbox = -1;
					INTERSECTED.material.visible = false;

                }
         
            }   
			
		}		
	}

}

function onDocumentMouseUp( event ) {

}


/**
 * 渲染
 */
function render() {
	
//	transformControl.update();
//	console.log( index );

	if( isAdd ) {

		initCamera( 1 );
		initOribtCtr();
//		console.log( scene );
		if( mode == 1 ) {

			for ( var i = 0; i < addModels.length; i ++ ) {

				scene.remove( scene.children[ index - 1 ] );
				index --;

			}

			for ( var i = 0; i < addModels.length; i ++ ) {

				var voxelMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, visible: false, transparent: true } );
				
				var Box = getBox( addModels[ i ].name );//获取包围盒信息
				X = Box[ 2 ];	//获取缩放倍数
				var voxel = new THREE.Mesh( Box[ 0 ], voxelMaterial );	//包围盒
				voxel.scale.set( X, X, X );	//缩放包围盒

				//获取鼠标点击位置
				voxel.position.set( addModels[ i ].position.x, addModels[ i ].position.y, addModels[ i ].position.z );
				console.log( boundingBoxName.length );
				voxel.name = addModels[ i ].name + boundingBoxName.length;	//设置包围盒名字

	//			voxel.position.y = voxel.position.y - Box[ 1 ].y * X / 2;

				var pos = new THREE.Vector3();
				pos.x = voxel.position.x;
				pos.y = voxel.position.y;
				pos.z = voxel.position.z;

				var model = loadModel( addModels[ i ].name );	//加载模型
				model.scale.set( X, X, X );	//放大
				model.position.set( pos.x, pos.y, pos.z );	//设置模型位置

				scene.add( voxel );		//场景中添加包围盒
				scene.add( model );		//场景中添加模型
				index = index + 2;		//场景中物体格式+1

				objects.push( voxel );
				boundingBoxes.push( voxel );
				models.push( model );
				boundingBoxName.push( voxel.name );

			}

			addModels.splice( 0, addModels.length );			
		}

		if( mode == 2 ) {

			calculateDirection( linePoints );

			for ( var i = 0; i < linePoints.length; i ++ ) {

				scene.remove( scene.children[ index - 1 ] );
				index --;

			}	

			for( var i = 0; i < tubeInfos.length; i ++ ) {

				for( var j = 0; j < tubeInfos[ i ].number; j ++ ) {

					var voxelMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, visible: false, transparent: true } );
					
					var Box = getBox( tubeInfos[ i ].name );//获取包围盒信息
					X = Box[ 2 ];	//获取缩放倍数
					var voxel = new THREE.Mesh( Box[ 0 ], voxelMaterial );	//包围盒
					voxel.scale.set( X, X, X );	//缩放包围盒

					//获取鼠标点击位置
					if( tubeInfos[ i ].angle == -Math.PI / 2 )
						voxel.position.set( tubeInfos[ i ].startpos.x - j * 77, tubeInfos[ i ].startpos.y, tubeInfos[ i ].startpos.z );
					else if( tubeInfos[ i ].angle == Math.PI / 2 )
						voxel.position.set( tubeInfos[ i ].startpos.x + j * 77, tubeInfos[ i ].startpos.y, tubeInfos[ i ].startpos.z );
					else if( tubeInfos[ i ].angle == 0 )
						voxel.position.set( tubeInfos[ i ].startpos.x, tubeInfos[ i ].startpos.y, tubeInfos[ i ].startpos.z + j * 77 );
					else
						voxel.position.set( tubeInfos[ i ].startpos.x, tubeInfos[ i ].startpos.y, tubeInfos[ i ].startpos.z - j * 77 );						
	//				console.log( boundingBoxName.length );
					voxel.name = tubeInfos[ i ].name + boundingBoxName.length;	//设置包围盒名字

		//			voxel.position.y = voxel.position.y - Box[ 1 ].y * X / 2;

					var pos = new THREE.Vector3();
					pos.x = voxel.position.x;
					pos.y = voxel.position.y;
					pos.z = voxel.position.z;

					var model = loadModel( tubeInfos[ i ].name );	//加载模型
					model.scale.set( X, X, X );	//放大
					model.position.set( pos.x, pos.y, pos.z );	//设置模型位置

					voxel.rotation.y = tubeInfos[ i ].angle;
					model.rotation.y = tubeInfos[ i ].angle;

					scene.add( voxel );		//场景中添加包围盒
					scene.add( model );		//场景中添加模型
					index = index + 2;		//场景中物体格式+1

					objects.push( voxel );
					boundingBoxes.push( voxel );
					models.push( model );
					boundingBoxName.push( voxel.name );					
				}

			}

			linePoints.splice( 0, linePoints.length );
			tubeInfos.splice( 0, tubeInfos.length );

		}


		isAdd = false;
		mode = 0;
/*		b.disabled = true;
		b.style.color="black";
		b.style.background="#bbbbbb";
	    b.style.cursor = "default"; 		*/
	    changeButtonStyle( addbutton, 0 );
	    changeButtonStyle( pointbutton, 1 );
	    changeButtonStyle( tubebutton, 1 );

	}

	if( isGroup ) {

		var x = 0, y = 0, z = 0;
		var length = groupModels.length;

		if( length != 2 )
			alert( "ERROR" );

		else {
			for( var i = length - 1; i > -1 ; i -- ) {
				var index_of_model = groupModels[ i ];
				models.splice(  index_of_model, 1 );
				objects.splice( 1 +  index_of_model, 1 );
				boundingBoxes.splice(  index_of_model, 1 );
				boundingBoxName.splice(  index_of_model, 1 );
				scene.remove( scene.children[ 5 +  index_of_model * 2 ] );
				scene.remove( scene.children[ 4 +  index_of_model * 2 ] );
				x = x + groupPos[ i ].x;
				y = y + groupPos[ i ].y;
				z = z + groupPos[ i ].z;
				index = index - 2;
			}

			var pos = new THREE.Vector3( x / length, y / length, z / length );

			var voxelMaterial = new THREE.MeshLambertMaterial( { color: 0xff0000, visible: false, transparent: true } );
			
			var Box = getBox( "sphereG" );//获取包围盒信息
			X = Box[ 2 ];	//获取缩放倍数
			var voxel = new THREE.Mesh( Box[ 0 ], voxelMaterial );	//包围盒
			voxel.scale.set( X, X, X );	//缩放包围盒
			console.log( boundingBoxName.length );
			voxel.name = "sphereG" + boundingBoxName.length;	//设置包围盒名字

			var model = loadModel( "sphereG" );	//加载模型
			model.scale.set( X, X, X );	//放大

			voxel.position.set( pos.x, pos.y, pos.z );
			model.position.set( pos.x, pos.y, pos.z );	//设置模型位置

			scene.add( voxel );		//场景中添加包围盒
			scene.add( model );		//场景中添加模型
			index = index + 2;		//场景中物体格式+1

			objects.push( voxel );
			boundingBoxes.push( voxel );
			models.push( model );
			boundingBoxName.push( voxel.name );	

		}


		groupModels.splice( 0, groupModels.length );
		groupPos.splice( 0, groupPos.length );

		isGroup = false;

	}
//	console.log( index_of_boundingbox );
	
	if( isAttach ) {

		var box = boundingBoxes[ index_of_boundingbox ];
		var model = models[ index_of_boundingbox ];
		transformControl.attach( box );
		model.position.set( box.position.x, box.position.y, box.position.z );
		model.rotation.set( box.rotation.x, box.rotation.y, box.rotation.z );
		model.scale.set( box.scale.x, box.scale.y, box.scale.z );	

		
	}
	else
		transformControl.detach( boundingBoxes[ index_of_boundingbox ] );


	if( isRemove ){

		if( index > 3 ){

			if( index == 4 ) {

				scene.remove( scene.children[ index - 1 ] );
				objects.splice( 0, objects.length );
				index --;
				gridHelper.visible = true;
/*				a.disabled = true;
				a.style.color="black";
				a.style.background="#bbbbbb";
			    a.style.cursor = "default"; 
				b.disabled = true;
				b.style.color="black";
				b.style.background="#bbbbbb";
			    b.style.cursor = "default"; */
			    changeButtonStyle( pointbutton, 0 );
			    changeButtonStyle( addbutton, 0 );
			    changeButtonStyle( tubebutton, 0 );

			}
			else {

				scene.remove( scene.children[ 5 + index_of_boundingbox * 2 ] );
				scene.remove( scene.children[ 4 + index_of_boundingbox * 2 ] );

				models.splice( index_of_boundingbox, 1 );
				objects.splice( 1 + index_of_boundingbox, 1 );
				boundingBoxes.splice( index_of_boundingbox, 1 );
				boundingBoxName.splice( index_of_boundingbox, 1 );
				
				index = index - 2;
			
			}
			
			isRemove = false;
		}
		else{
			alert( "无模型可删除" );
			isRemove = false;		    			
		}


	}
/*
	if( isChangeColor ) {

        for( var i = 0; i < models[ index_of_boundingbox ].children[0].children.length; i ++ ) {

			models[ index_of_boundingbox ].children[ 0 ].children[ i ].children[ 0 ].material.color.r  = Math.random();
			models[ index_of_boundingbox ].children[ 0 ].children[ i ].children[ 0 ].material.color.g  = Math.random();
			models[ index_of_boundingbox ].children[ 0 ].children[ i ].children[ 0 ].material.color.b  = Math.random();
			models[ index_of_boundingbox ].children[ 0 ].children[ i ].children[ 0 ].material.emissive.setHex( 0x000000 );
        }

		isChangeColor = false;
	}
*/
	renderer.render( scene, camera );

}


/**
 * 动画
 */
function animate() {

	requestAnimationFrame( animate );
	transformControl.update();
	render();

}


/**
 * 总函数
 */
function init() {

	initScene();
	initCamera( 1 );
	initRender();
	initOribtCtr();
	initTransformCtr();
	initLight();
	initSize();
	initGrid();
	add();
	addListener();
	animate();

}


/**
 *鼠标点击页面图片获取当前obj的ID
 */
function getID( obj ) {

    var id = obj.id;//获取id

	if( numberofModel == 0 )
		alert("请先选择土地")
	else {
		if( isPoint ) {
			addModels[ addModels.length - 1 ].name = id;
			addModels[ addModels.length - 1 ].index = addModelIndex;
			addModelIndex ++;
			scene.children[ index - 1 ].material.color.r = 0;
			scene.children[ index - 1 ].material.color.g = 1;
			numberofModel ++;
			changeButtonStyle( addbutton, 1 );
		}
		else if( isTube ) {
			for( var i = 0; i < tubeInfos.length; i ++ ) {
				tubeInfos[ i ].name = id;
			}
			for( var i = tubeInfos.length + 1; i > 0; i -- ) {
				scene.children[ index - i ].material.color.r = 0;
				scene.children[ index - i ].material.color.g = 1;				
			}
			changeButtonStyle( addbutton, 1 );
		}
		else {
			isGet = true;    
			ids.push( id );
			console.log( "模型个数:" + ( numberofModel + 1 ) );
			numberofModel ++;			
		}
	
	}
	    
}

function getGround() {

	var id = "ground";//获取id
    ids.push( id );

    if( numberofModel != 0 )
    	alert( "不要重复建造土地" );

    else {

    	document.getElementById('uv_img').click();
	    isGround = true;
	    numberofModel ++; 
/*		a.disabled = false;
		a.style.color="white";
		a.style.background="#4CAF50";
	    a.style.cursor = "pointer";   	
	    changeButtonStyle( pointbutton, 1 );
	    changeButtonStyle( tubebutton, 1 );*/
    }

}

function getImage() {

	var obj = window.parent.document.getElementById('uv_img');
	uv_img_name = obj.files[0].name;

	uv_size.splice( 0, uv_size.length );

    createReader(obj.files[0], function (w, h) { uv_size.push( w ); uv_size.push( h / 2 ) } );

}


/**
 * 获取图片长宽数据
 */
createReader = function(file, whenReady) {

    var reader = new FileReader;

    reader.onload = function (evt) {

        var image = new Image();
        image.onload = function () {

            var width = this.width;
            var height = this.height;
            if (whenReady) whenReady(width, height);

        };
        image.src = evt.target.result;
    };

    reader.readAsDataURL(file);

}


/**
 * 删除模型
 */
function remove() {

	isRemove = true;
	if( numberofModel > 0 ){
		numberofModel --;
	}

}

/**
 * 锚点
 */
function pointModel() {

	if( numberofModel == 0 )
		alert("请先选择土地")
	else {
		isPoint = true;
		initCamera( 2 );
//		controls.enabled = false;
		mode = 1;
		changeButtonStyle( tubebutton, 0 );
//		var b = document.querySelector( ".button1" );
/*		b.disabled = false;
		b.style.color="white";
		b.style.background = "#4CAF50";
		b.style.cursor = "pointer";*/
//		changeButtonStyle( addbutton, 1 );
	}

}

/**
 * 加模型
 */
function addModel() {

	if( mode == 1 ) {
		isPoint = false;
		isAdd = true;
//				mode = 0;
//				console.log( mode );				
	}
	else if( mode == 2 ) {
		isTube = false;
		isAdd = true;
//				mode = 0;
	}

//	controls.enabled = true;

}

/**
 * 画管道线
 */
function lineTube() {

	isTube = true;
	initCamera( 2 );
	mode = 2;
	changeButtonStyle( pointbutton, 0 );

}

/**
 * 获取包围盒大小
 */
function getBox( id ) {

	var group = [];

	var box = new THREE.Geometry();
	var boxVertices = [];
	var X;

	for( var i = 0; i < boundingbox.length; i ++ ) {
		if( id == boundingbox[i].name ) {

			boxVertices[ 0 ] = new THREE.Vector3( boundingbox[ i ].x0, boundingbox[ i ].y0, boundingbox[ i ].z0 );
			boxVertices[ 1 ] = new THREE.Vector3( boundingbox[ i ].x1, boundingbox[ i ].y1, boundingbox[ i ].z1 );
			boxVertices[ 2 ] = new THREE.Vector3( boundingbox[ i ].x2, boundingbox[ i ].y2, boundingbox[ i ].z2 );
			boxVertices[ 3 ] = new THREE.Vector3( boundingbox[ i ].x3, boundingbox[ i ].y3, boundingbox[ i ].z3 );
			boxVertices[ 4 ] = new THREE.Vector3( boundingbox[ i ].x4, boundingbox[ i ].y4, boundingbox[ i ].z4 );
			boxVertices[ 5 ] = new THREE.Vector3( boundingbox[ i ].x5, boundingbox[ i ].y5, boundingbox[ i ].z5 );
			boxVertices[ 6 ] = new THREE.Vector3( boundingbox[ i ].x6, boundingbox[ i ].y6, boundingbox[ i ].z6 );
			boxVertices[ 7 ] = new THREE.Vector3( boundingbox[ i ].x7, boundingbox[ i ].y7, boundingbox[ i ].z7 );
			X = boundingbox[ i ].size;

			break;
		}
	}

	box.vertices = boxVertices;


	var boxFaces=[

		new THREE.Face3(0,1,2),
		new THREE.Face3(0,2,3),
		new THREE.Face3(0,3,7),
		new THREE.Face3(0,7,4),		
		new THREE.Face3(6,5,4),
		new THREE.Face3(6,4,7),
		new THREE.Face3(1,5,6),
		new THREE.Face3(1,6,2),
		new THREE.Face3(0,4,5),
		new THREE.Face3(5,1,0),
		new THREE.Face3(3,2,7),
		new THREE.Face3(2,6,7)

	];

	box.faces = boxFaces;
	box.computeFaceNormals();

	group.push( box );

	var size = new THREE.Vector3();
	size.x = boxVertices[ 0 ].x - boxVertices[ 1 ].x;
	size.y = boxVertices[ 1 ].y - boxVertices[ 2 ].y;
	size.z = boxVertices[ 2 ].z - boxVertices[ 6 ].z;

	group.push( size );
	group.push( X );

	return group;

}


/**
 * 获取包围盒编号
 */
function returnIndex( name ) {

	var index;

	for( var i = 0; i < boundingBoxName.length; i ++ ) {
		if( name == boundingBoxName[ i ] ) {
			index = i;
			break;
		}
	}

	return index;

}

/**
 * 改变按钮CSS
 */
function changeButtonStyle( name, mode ) {

	switch( mode ) {
		case 0:
			name.disabled = true;
			name.style.color="black";
			name.style.background="#bbbbbb";
		    name.style.cursor = "default";	
		    break;
		case 1:
			name.disabled = false;
			name.style.color="white";
			name.style.background = "#4CAF50";
			name.style.cursor = "pointer";	
			break;	    	
	}

 	
}


/**
 * 油管线
 */
function calculateDirection( array ) {
/*
	var x = Math.abs( array[ 0 ].x - array[ 1 ].x );
	var z = Math.abs( array[ 0 ].z - array[ 1 ].z );

	midpos.x = ( array[ 0 ].x + array[ 1 ].x ) / 2;
	midpos.y = 0;
	midpos.z = ( array[ 0 ].z + array[ 1 ].z ) / 2;

	if( x > z ) {
		rotateAngel = Math.PI/2;
		return x;
	}
	else {
		rotateAngel = 0;
		return z;
	}

	tubeNums.splice( 0, tubeNums.length );
	rotateAngels.splice( 0, rotateAngels.length );
*/
	for( var i = 0; i < tubeInfos.length; i ++ ) {
		var x = array[ i + 1 ].x - array[ i ].x ;
		var z = array[ i + 1 ].z - array[ i ].z ;
		if( Math.abs( x ) > Math.abs( z ) ) {
			if( x < 0 ) {
				tubeInfos[ i ].angle = -Math.PI / 2;
				tubeInfos[ i ].number = Math.round( Math.abs( x ) / 77 );
				tubeInfos[ i ].startpos.x -= 38.5;
			}
			else {
				tubeInfos[ i ].angle = Math.PI / 2;
				tubeInfos[ i ].number = Math.round( x / 77 );
				tubeInfos[ i ].startpos.x += 38.5;				
			}
		}
		else {
			if( z > 0 ) {
				tubeInfos[ i ].angle = 0;
				tubeInfos[ i ].number = Math.round( z / 77 );
			}
			else {
				tubeInfos[ i ].angle = Math.PI;
				tubeInfos[ i ].number = Math.round( Math.abs( z ) / 77 );				
			}			
		}
	}

} 