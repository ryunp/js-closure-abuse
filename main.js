
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
 *
 * First and foermost understand the lexicaly scoped function execution context
 * http://davidshariff.com/blog/javascript-scope-chain-and-closures/
 *
 * Common mistake is to refernce scopes unknowingly which can cause memory
 * leaks. Probably the most misunderstood topic of JS, is execution context
 * chaining.
 * 
 */

/** Subject A - Original Procedure AKA "Closure Abuse"
 * If you don't immediately understand it, good; it took me a while to 
 * figure out exactly what was going on
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
 * ++ Loop Steps ++
 * 1) Create anon function that sets a timeout
 * 2) Bind preserves context, and is immediately called with an argument
 * 3) Create Anon function that calls context method with 1's param
 * 4) Bind preserves context, returning new functor
 * 5) 4's functor is sent to the Event Queue with predefined context
 * 
 * Scope chain: 4 <- 3 (Method Call) -> 2 -> 1
 * All scopes are referencing each other in some way
 */



/** Subject B - Not So Closure
 * That didn't seem efficient. I reduced binding usage down to one extra scope
 * 
 * for(i=0; i < queue.length; i++) {
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
 * Scope chain: 2 <- 1 (Method Call)
 */



/** Subject C - Nosure® (more like Singlesure®)
 * The reduction could go even further, especially clear without the convolution
 *
 * for(i=0; i < queue.length; i++)
 *   setTimeout( this.show.bind(this, el, queue[i]), delay * i );
 *
 * ++ Loop Steps ++
 * setTimeout( this.show.bind(this, queue[i]), delay * i );
 *
 * 1) Bind preserves context and arguments by returning new functor
 * 2) 1's functor is sent to the Event Queue with predefined context and param
 *
 * Scope Chain: 1 (Method Call)
 *
 * Shnazzy
 */