/* Ryan Paul - 03/31/16
 * Scope chains, context, closures, and binding
 */


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

	for (i=0; i < queue.length; i++) {
		((function(offset){
			setTimeout((function(){
				this.show(el, queue[offset]);
			}).bind(this), offset * delay);
		}).bind(this))(i);
	}
};


// :|
Test.prototype.run_meh = function(el, queue, ms) {

	var delay = ms;

	for (i=0; i < queue.length; i++) {
		setTimeout((function(item) {
			this.show(el, item);
		}).bind(this, queue[i]), delay * i);
	}
};


// :D
Test.prototype.run_cranked = function(el, queue, ms) {

	var delay = ms;

	for (i=0; i < queue.length; i++)
		setTimeout( this.show.bind(this, el, queue[i]), delay * i );
};


/* 
 * Test
 */

var t = new Test();

var originalEl = document.querySelector("#original"),
	mehEl = document.querySelector("#meh"),
	crankedEl = document.querySelector("#cranked");

t.run_original(originalEl, ["This is run_original!", "1/10"], 2000);
t.run_meh(mehEl, ["This is run_meh!", "4/10"], 3000);
t.run_cranked(crankedEl, ["This is run_cranked!", "11/10"], 4000);


/* 
 * Diary
 *
 * First and foermost understand the lexicaly scoped function execution context
 * http://davidshariff.com/blog/javascript-scope-chain-and-closures/
 *
 * Common mistake is to refernce vlosures unknowingly which can cause memory
 * leaks. Probably the most misunderstood topic of JS, is execution scope
 * chaining.
 * 
 */

/** Subject A - Original Procedure AKA "Closure Abuse"
 * If you don't immediately understand it, good; it took me a while to 
 * figure out exactly what was going on
 *
 * for (i=0; i < queue.length; i++) {
 *     ((function(offset){
 *       setTimeout((function(){
 *         this.show(el, queue[offset]);
 *       }).bind(this), offset * calculated_bpm)
 *     }).bind(this))(i);
 *   }
 * }
 * 
 * ++ Loop Steps ++
 * 1) Create anon function with one parameter that sets a timeout
 * 2) Bind called on function preserving only context, then called with argument
 * 3) Create another Anon function that calls function with 1's scoped param
 * 4) Bind preserves context, returning new another functor refferemcomg 3's scope
 * setTimeout: 4's functor is sent to the Event Queue with predefined context
 * 
 * run_original() call stack:
 * (anonymous function)	@	main.js:25 // setTimeout((function(){ }).bind(this), offset * delay);
 * Test.run_original	@	main.js:28 // ((function(offset){ }).bind(this))(i);
 * (anonymous function)	@	main.js:66 // t.run_original( ... );
 * 
 * Callback call stack:
 * 0.2ms 100.0%	(anonymous function)
 * 0.2ms 100.0%	Test.show main.js:14
 * 0.1ms 65.07%	insertAdjacentHTML
 * 
 * As you can see, two extra closures are created and held in memory. One at run_meh,
 * and another when the callback is called. No bueno.
 * */



/** Subject B - Not So Closure
 * That didn't seem efficient. I reduced binding usage down to one extra scope
 * 
 * for (i=0; i < queue.length; i++) {
 *   setTimeout((function(item) {
 *     this.show(el, item);
 *   }).bind(this, queue[i]), delay * i);
 * }
 *
 * ++ Loop Steps ++
 * 1) Create anon function that calls a context method
 * 2) Bind preserves context and arguments by returning new functor
 * 3) 2's functor is sent to the Event Queue with predefined context and param
 *
 * 
 * run_meh() call stack:
 * Test.run_meh	@		main.js:39 // setTimeout((function(item) { ... }).bind(this, queue[i]), delay * i);
 * (anonymous function)	@	main.js:67 // t.run_meh( ... );
 *
 * Callback call stack:
 * 0.2ms 100.0%	(anonymous function)
 * 0.2ms 100.0%	Test.show main.js:11
 * 0.0ms 21.04%	insertAdjacentHTML
 *
 * Now only one extra closure is formed when the callback
 * is called. Not bad.
 * 
 */



/** Subject C - Nosure® (more like Singlesure®)
 * The reduction could go even further, especially clear without the convolution
 *
 * for (i=0; i < queue.length; i++)
 *   setTimeout( this.show.bind(this, el, queue[i]), delay * i );
 *
 * ++ Loop Steps ++
 * setTimeout( this.show.bind(this, queue[i]), delay * i );
 *
 * 1) Bind preserves context and arguments by returning new functor
 * 2) 1's functor is sent to the Event Queue with predefined context and param
 *
 * run_cranked() call stack:
 * Test.run_cranked	@	main.js:52 // setTimeout((function(item) { ... }).bind(this, queue[i]), delay * i);
 * (anonymous function)	@	main.js:68 // t.run_cranked( ... );
 * 
 * Callback call stack:
 * 0.2ms 100.0%	Test.show main.js:11
 * 0.1ms 33.00%	insertAdjacentHTML
 * 
 * No extra closures are created. Just one single binded functor, sexily packaged
 * up with context and arguments ready for calling. Life is good.
 */
