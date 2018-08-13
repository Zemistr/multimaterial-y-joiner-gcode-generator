new Vue({
    el: '#app',
    data: {
        wasteBlockX: 50,
        wasteBlockY: 150,
        wasteBlockSize: 32,
        filamentParkingPosition: 140,
    },
    computed: {
        startGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                ';↑↑↑ YOUR CODE ↑↑↑\n' +
                '\n' +
                'M83                              ;extruder relative positioning\n' +
                'G1 Y-4 X0 Z15 F6000              ;move on cleaning position\n' +
                'G1 E' + (this.filamentParkingPosition - 10) + ' F10000                   ;undo storage position\n' +
                'G1 E10 F300                      ;extrude another 10mm to finish undo storage\n' +
                'G1 E40 F150                      ;extrude 40mm to clean the nozzle\n' +
                'G1 E-2 F500                      ;retract 2 mm\n' +
                'G92 E0                           ;zero the extruded length again\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        endGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                'M104 S0                  ;extruder heater off\n' +
                'M140 S0                  ;heated bed heater off (if you have it)\n' +
                'M83                      ;extruder relative positioning\n' +
                'G91                      ;relative positioning\n' +
                'G1 E-1 F300              ;retract the filament a bit before lifting the nozzle, to release some of the pressure\n' +
                'G1 E-5 Z+0.5 X-20 Y-20   ;move Z up a bit and retract filament even more\n' +
                'G1 E-' + (this.filamentParkingPosition - 6) + ' F3000           ;retract the rest\n' +
                'G92 E0                   ;zero the extruded length again\n' +
                'G90                      ;absolute positioning\n' +
                'G28 X0 Y0                ;move X/Y to min endstops, so the head is out of the way\n' +
                '\n' +
                ';↓↓↓ YOUR CODE ↓↓↓\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        startExtruderGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                ';↑↑↑ YOUR CODE ↑↑↑\n' +
                '\n' +
                'M83                ;extruder relative positioning\n' +
                'G90                ;absolute positioning\n' +
                'G1 X' + (this.wasteBlockX - (this.wasteBlockSize * 0.6)) + ' Y' + (this.wasteBlockY + (this.wasteBlockSize * 0.6)) + ' F3600  ;move ON the waste block\n' +
                'G91                ;relative positioning\n' +
                'G1 Z-2 F3600       ;touch the waste block\n' +
                'G1 E' + (this.filamentParkingPosition - 15) + ' F10000     ;undo storage position\n' +
                'G1 E5 F500         ;extrude another 5mm\n' +
                'G1 E7 F200         ;extrude last 10 - 3 mm to finish safe undo storage\n' +
                'G92 E0             ;zero the extruded length again\n' +
                'G90                ;absolute positioning\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        },
        endExtruderGcode: function () {
            return ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;\n' +
                'M83                       ;extruder relative positioning\n' +
                'G91                       ;relative positioning\n' +
                'G1 E-7 F10000             ;stage 1 of 3 stage retraction\n' +
                'G1 X+0.5 Y+0.5 F10000     ;move/clean nozzle little bit\n' +
                'G1 Z+2 F10000             ;move up far from object\n' +
                'G1 E4 F10000              ;stage 2 of 3 stage retraction\n' +
                'G1 E-' + this.filamentParkingPosition + ' F10000           ;stage 3, this keeps from producing "hair"\n' +
                'G92 E0                    ;zero the extruded length again\n' +
                'G90                       ;absolute positioning\n' +
                '\n' +
                ';↓↓↓ YOUR CODE ↓↓↓\n' +
                ';;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;';
        }
    }
});
