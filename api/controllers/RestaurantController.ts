import { AppDataSource } from "../../ormconfig";
import {Request, Response } from "express"
import { BadRequestError, ConflictError, NotFoundError } from "../utils/internalErrors";
import fs from 'fs';
import { Restaurant } from "../models/Restaurant";
import { RestaurantRepository } from "../repositories/RestaurantRepository";

enum MESSAGE {
  BAD_REQUEST = 'Dados incompletos',
  BAD_REQUEST_INVALID_TIME = 'Horários inválidos. O encerramento deve ser maior que o horário de abertura e a diferença mínima deve ser de 15 minutos entre eles',
  CONFLICT_NAME = 'Restaurante com mesmo nome já existe',
  NOT_FOUND = 'Restaurante não encontrado'
}

class RestaurantController {

  /* 
    REGRAS DE NEGÓCIO: 
     - Não é permitido que 2 restaurantes com mesmo nome sejam cadastrados
     - O horário de abertura DEVE ser MENOR que o horário de encerramento
     - O tempo entre o horário de abertura e encerramento DEVE ser de no MÍNIMO 15 MINUTOS 
     - Os campos de horário devem estar no formato HH:mm
  */
  async create(request: Request, response: Response){
    let restaurant = request.body

    if(Object.keys(restaurant).length === 0 ) throw new BadRequestError(MESSAGE.BAD_REQUEST)

/*     let findRestaurant = await AppDataSource.query(
      `SELECT * FROM Restaurante WHERE nome = "${restaurant.nome}"`
    )

    if(findRestaurant.length > 0) throw new ConflictError(MESSAGE.CONFLICT_NAME) */

    var timeStart = new Date("01/01/2007 " + restaurant.abertura).getTime()
    var timeEnd = new Date("01/01/2007 " + restaurant.encerramento).getTime()

    var hourDiff = timeEnd - timeStart; 

    if(restaurant.abertura >= restaurant.encerramento || (hourDiff / 60000) <= 15)
      throw new BadRequestError(MESSAGE.BAD_REQUEST_INVALID_TIME)
    
    const repository = new RestaurantRepository()
    let result = await repository.save(restaurant)

    return response.status(201).json({id: result.insertId, ...restaurant})
  }

  async get_restaurant(request: Request, response: Response){
    let {id} = request.params

    const restauratRepo = new RestaurantRepository()

    let findRestaurant = await restauratRepo.getById(Number(id))

    if(findRestaurant.length === 0) throw new NotFoundError(MESSAGE.NOT_FOUND)

    return response.status(200).json(findRestaurant[0])

  }

  async update(request: Request, response: Response){
    let {id} = request.params
    let restaurant = request.body

/*    let findRestaurant = await AppDataSource.query(
      `SELECT * FROM Restaurante WHERE id = ${id}`
    )

    if(findRestaurant.length === 0) throw new NotFoundError(MESSAGE.NOT_FOUND)

     if(restaurant.nome){
      let findDuplicatedRestaurant = await AppDataSource.query(
        `SELECT * FROM Restaurante WHERE nome = "${restaurant.nome}" AND id != ${id}`
      )

      if(findDuplicatedRestaurant.length > 0) throw new ConflictError(MESSAGE.CONFLICT_NAME)
    } */

    const respository = new RestaurantRepository()
    let updateRestaurant = await respository.update({id: id, ...restaurant})

    return response.status(200).json(updateRestaurant)

  }

  async delete(request: Request, response: Response){
    let {id} = request.params

    const repository = new RestaurantRepository()
    let deleteRestaurant = await repository.delete(id)

    return response.sendStatus(200)
  }

  async get_restaurants(request: Request, response: Response){

    let {query} = request
    let { perPage, page, ...q } = request.query;
    let realPage: number;
    let realTake: number;

    if (perPage) realTake = +perPage;
    else {
      perPage = '10';
      realTake = 10;
    }

    if (page) realPage = +page === 1 ? 0 : (+page - 1) * realTake;
    else {
      realPage = 0;
      page = '1';
    }
    
    const repository = new RestaurantRepository()
    let findRestaurants = await repository.getAll() 

    const getQuery = () => Object.keys(q).map((key) => `${key}=${q[key]}`).join('&');

    const qp: string = getQuery().length === 0 ? '' : `&${getQuery()}`;

    const data: any = {
      records: findRestaurants,
      perPage: realTake,
      page: +page || 1,
      pageCount: (findRestaurants.length > realTake
        ? (findRestaurants.length % realTake) > 0
          ? Math.floor(findRestaurants.length / realTake) + 1 
          : Math.floor(findRestaurants.length / realTake) 
        : 1),
      recordCount: findRestaurants.length,
      next: `http://localhost:3308/restaurants?perPage=${realTake}&page=${
        +page + 1
      }${qp}`,
      prev: `http://localhost:3308/restaurants?perPage=${realTake}&page=${
        +page - 1
      }${qp}`,
    }

    if((+page - 1) == 0)  delete data.prev;
    if((data.pageCount < (+data.page + 1))) delete data.next;

    return response.status(200).json(data)
  }

}

export {RestaurantController}