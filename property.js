
DefineProperty = (function () {
        if (Object.prototype.__defineGetter__ && Object.prototype.__defineSetter__) {
            function DefineProperty(prototype, property, getter, setter) {
                if (typeof getter !== 'undefined') {
                    prototype.__defineGetter__(property, getter);
                }
                if (typeof setter !== 'undefined') {
                    prototype.__defineSetter__(property, setter);
                }
            }
            return DefineProperty;
        } else if (Object.defineProperty) {
            function DefineProperty(prototype, property, getter, setter) {
                Object.defineProperty(prototype, property, {'get': getter, 'set': setter});
            }
            return DefineProperty;
        }
})();
