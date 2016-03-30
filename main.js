
var Test = function() {
	this.el = document.body;
};


Test.prototype.show = function(el, data){

	var html = "<p>" + data + "</p>";
	el.insertAdjacentHTML("beforeend", html);
};


// :<
Test.prototype.run_original = function(el, queue, ms){

	var delay = ms;    

	for(i=0; i < queue.length; i++){
		((function(offset){
			setTimeout((function(){
				this.show(el, queue[offset]);
			}).bind(this), offset * delay)
		}).bind(this))(i);
	}
};


// :|
Test.prototype.run_meh = function(el, queue, ms) {

	var delay = ms;

	for(i=0; i < queue.length; i++) {
		setTimeout((function(item) {
			this.show(el, item);
		}).bind(this, queue[i]), delay * i);
	}
};


// :D
Test.prototype.run_cranked = function(el, queue, ms) {

	var delay = ms;

	for(i=0; i < queue.length; i++)
		setTimeout( this.show.bind(this, el, queue[i]), delay * i );
};


/* 
 * Test
 */

var t = new Test();

var originalEl = document.querySelector("#original");
var mehEl = document.querySelector("#meh");
var crankedEl = document.querySelector("#cranked");

t.run_original(originalEl, ["This is run_original!", "1/10"], 2000);
t.run_meh(mehEl, ["This is run_meh!", "4/10"], 3000);
t.run_cranked(crankedEl, ["This is run_cranked!", "11/10"], 4000);


/* 
 * Diary
 */

/** Subject A - Original Procedure AKA "Closure Abuse"
 * If you don't immediately understand it, good; it took me a while to 
 * figure out exactly what was going on.
 *
 * for(i=0; i < queue.length; i++){
 *     ((function(offset){
 *       setTimeout((function(){
 *         this.play(el, queue[offset]);
 *       }).bind(this), offset * calculated_bpm)
 *     }).bind(this))(i);
 *   }
 * }
 *
 * 
 * ++ Statement 1 ++
 * for(i=0; i < queue.length; i++){ X }
 *
 * Looping N times. That includes creating objects each time... (derp)
 * 
 *
 * 
 * ++ Statement N.1 ++
 * ((function(offset){ Y }).bind(this))(i);
 * 
 * Create an anonymous function object, bind context, and then call it 
 * passing current index value of the for loop. This is really only just 
 * encapsulating a variable into a new execution environment. We'll call 
 * this specimen F1.
 *
 * (obj) <-- [F1]
 *          [run]
 * Stack: [ancestors]
 * 
 *
 * 
 * ++ Statement N.2 ++
 * setTimeout((function(){ Z }).bind(this), offset * calculated_bpm)
 * 
 * Now we are running in F1's stack frame context. We call setTimeout
 * by creating another function object, specimen F2, with it's context bound
 * to F1's context, and giving it a delay from previously bound to F1.
 *
 *         ,------------<---------.
 * (obj) <-- [F1] ---(F2)-.        \
 *          [run]          \       [F2]
 * Stack: [ancestors]       '--> |Event Queue|
 */


/** Subject B - Not So Closure
 * That didn't seem efficient. I reduced binding usage down to one.
 * 
 * for(i=0; i < queue.length; i++) {
 *   setTimeout((function(item) {
 *     this.show(el, item);
 *   }).bind(this, queue[i]), delay * i);
 * }
 *
 * 
 * ++ Statement 1 ++
 * for(i=0; i < queue.length; i++){ X }
 *
 *
 * 
 * ++ Statement N.1 ++
 * setTimeout((function(item) { Y }).bind(this, queue[i]), delay * i);
 * 
 * Create anonymous function binding the context and argument as parameters.
 * This function object gets passed as the callback. Now only one function 
 * object is created; instead of an outer closure to preserve the index it 
 * is passed as an argument of the bind() function. Much clearer when
 * binding is happening and less cruft.
 * 
 */


/** Subject C - Nosure® (more like Singlesure®)
 * "What excatly are we trying to preserve?"... All we really want is to
 * create a callback function while preserving context and arguments.
 * "But, wait, that IS what bind() does..." ...
 *
 * for(i=0; i < queue.length; i++)
 *   setTimeout( this.show.bind(this, el, queue[i]), delay * i );
 *
 * 
 * ++ Statement 1 ++
 * for(i=0; i < queue.length; i++){ X }
 *
 *
 * 
 * ++ Statement N.1 ++
 * setTimeout( this.show.bind(this, queue[i]), delay * i );
 *
 * Now there is no extra objects created, just the one from bind's return,
 * bind does it's magic:
 * 
 * 1) Create a function object with 'this.show' as it's target
 * 2) Bind it's this' to current this
 * 3) Set arguments to be sent with the call
 *
 * And when setTimeout's callback statement gets fired, the function 
 * object's __Call__ function splats the arguments into the actual call.
 * 
 * The new function object (bind()'s return) is all packed up and passed to 
 * the Timeout function; ready for calling. Avoids hysterical closure abuse.
 */