import * as THREE from 'three'
import OrbitControls from 'three-orbitcontrols'
import * as d3 from 'd3'

import chinajson from "assets/json/china.json"

class LineMap {
    constructor(container) {
      this.container = container ? container : document.body;
    }

    init() {
      this.provinceInfo = document.getElementById('provinceInfo');
      // 渲染器
      this.renderer = new THREE.WebGLRenderer();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.container.appendChild(this.renderer.domElement);

      // 场景
      this.scene = new THREE.Scene();

      // 相机 透视相机
      this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.set(0, -70, 150);
      this.camera.lookAt(0, 0, 0);

      this.setController(); // 设置控制

      this.setLight(); // 设置灯光

      this.setRaycaster();

      this.animate();

      // this.loadFont(); // 加载字体
      
      this.loadMapData();

      this.setResize(); // 绑定浏览器缩放事件
    }

    setResize() {
      let _this = this;
      window.addEventListener('resize', function () {
        _this.renderer.setSize(window.innerWidth, window.innerHeight);
      })
    }

    loadMapData() {
      let _this = this;

      // 加载json文件
    //   let loader = new THREE.FileLoader();
    //   loader.load('/assets/json/china.json', function (data) {
    //       console.log(data)
    //     let jsonData = JSON.parse(data);
    //     _this.initMap(jsonData);
    //   });

      this.initMap(chinajson)
    }

    loadFont() { //加载中文字体
      var loader = new THREE.FontLoader();
      var _this = this;
      loader.load('fonts/chinese.json', function (response) {
        _this.font = response;
        _this.loadMapData();
      });

    }

    createText(text, position) {
      var shapes = this.font.generateShapes(text, 1);

      var geometry = new THREE.ShapeBufferGeometry(shapes);

      var material = new THREE.MeshBasicMaterial();

      var textMesh = new THREE.Mesh(geometry, material);
      textMesh.position.set(position.x, position.y, position.z);

      this.scene.add(textMesh);
    }

    initMap(chinaJson) {
      // 建一个空对象存放对象
      this.map = new THREE.Object3D();

      let _this = this;

      // 墨卡托投影转换
      const projection = d3.geoMercator().center([104.0, 37.5]).scale(80).translate([0, 0]);

      chinaJson.features.forEach(elem => {
        // 定一个省份3D对象
        const province = new THREE.Object3D();
        // 每个的 坐标 数组
        const coordinates = elem.geometry.coordinates;
        // 循环坐标数组
        coordinates.forEach(multiPolygon => {

          multiPolygon.forEach(polygon => {
            const shape = new THREE.Shape();
            const lineMaterial = new THREE.LineBasicMaterial({
              color: 'white'
            });
            
            const points = [];

            for (let i = 0; i < polygon.length; i++) {
              const [x, y] = projection(polygon[i]);
              if (i === 0) {
                shape.moveTo(x, -y);
              }
              shape.lineTo(x, -y);
              points.push(new THREE.Vector3(x, -y, 4.01));
            }

            const lineGeometry = new THREE.BufferGeometry().setFromPoints( points );

            const extrudeSettings = {
              depth: 4,
              bevelEnabled: false
            };

            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshBasicMaterial({
              color: '#02A1E2',
              transparent: true,
              opacity: 0.6
            });
            const material1 = new THREE.MeshBasicMaterial({
              color: '#3480C4',
              transparent: true,
              opacity: 0.5
            });
            /* const material = new THREE.MeshBasicMaterial({ color: '#dedede', transparent: false, opacity: 0.6 });
            const material1 = new THREE.MeshBasicMaterial({ color: '#dedede', transparent: false, opacity: 0.5 }); */
            const mesh = new THREE.Mesh(geometry, [material, material1]);
            const line = new THREE.Line(lineGeometry, lineMaterial);
            province.add(mesh);
            province.add(line)

          })

        })

        // 将geo的属性放到省份模型中
        province.properties = elem.properties;
        if (elem.properties.contorid) {
          const [x, y] = projection(elem.properties.contorid);
          province.properties._centroid = [x, y];
        }

        _this.map.add(province);

      })

      this.scene.add(this.map);
    }

    setRaycaster() {
      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();
      this.eventOffset = {};
      var _this = this;

      function onMouseMove(event) {

        // calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components

        _this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        _this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        _this.eventOffset.x = event.clientX;
        _this.eventOffset.y = event.clientY;
        this.provinceInfo.style.left = _this.eventOffset.x + 2 + 'px';
        this.provinceInfo.style.top = _this.eventOffset.y + 2 + 'px';
      }

      window.addEventListener('mousemove', onMouseMove, false);
    }

    setLight() {
      let ambientLight = new THREE.AmbientLight(0xffffff); // 环境光
      this.scene.add(ambientLight);
    }

    setController() {
      this.controller = new OrbitControls(this.camera, this.renderer.domElement);
      /* this.controller.enablePan = false; // 禁止右键拖拽
      this.controller.enableZoom = true; // false-禁止右键缩放
      
      this.controller.maxDistance = 200; // 最大缩放 适用于 PerspectiveCamera
      this.controller.minDistance = 50; // 最大缩放
      this.controller.enableRotate = true; // false-禁止旋转 */

      /* this.controller.minZoom = 0.5; // 最小缩放 适用于OrthographicCamera
      this.controller.maxZoom = 2; // 最大缩放 */

    }

    animate() {
      requestAnimationFrame(this.animate.bind(this));
      // this.cube.rotation.x += 0.05;
      // this.cube.rotation.y += 0.05;
      this.raycaster.setFromCamera(this.mouse, this.camera);

      // calculate objects intersecting the picking ray
      var intersects = this.raycaster.intersectObjects(this.scene.children, true);
      if (this.activeInstersect && this.activeInstersect.length > 0) { // 将上一次选中的恢复颜色
        this.activeInstersect.forEach(element => {
          element.object.material[0].color.set('#02A1E2');
          element.object.material[1].color.set('#3480C4');
        });
      }

      this.activeInstersect = []; // 设置为空

      for (var i = 0; i < intersects.length; i++) {
        if (intersects[i].object.material && intersects[i].object.material.length === 2) {
          this.activeInstersect.push(intersects[i]);
          intersects[i].object.material[0].color.set(0xff0000);
          intersects[i].object.material[1].color.set(0xff0000);
          break; // 只取第一个
        }
      }
      this.createProvinceInfo();

      this.renderer.render(this.scene, this.camera);
    }

    createProvinceInfo() { // 显示省份的信息      
      if (this.activeInstersect.length !== 0 && this.activeInstersect[0].object.parent.properties.name) {
        var properties = this.activeInstersect[0].object.parent.properties;

        this.provinceInfo.textContent = properties.name;

        this.provinceInfo.style.visibility = 'visible';
      } else {
        this.provinceInfo.style.visibility = 'hidden';
      }
    }
  }

export default LineMap